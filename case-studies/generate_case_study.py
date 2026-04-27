#!/usr/bin/env python3
"""
Deterministic case-study generator for RKV Consulting.

Pulls real Supabase data for a single property over a date window and
emits a markdown skeleton with hard numbers filled in. Narrative sections
are marked [NARRATIVE: ...] and intended to be filled by an LLM in a
second pass — keeping token spend off the deterministic parts.

Usage:
    python3 generate_case_study.py \\
        --property-id <uuid> \\
        --window-days 90 \\
        --output ./[C]-case-study-<slug>.md

Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
../.env.local (CRLF-tolerant).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env.local"


def load_env() -> tuple[str, str]:
    if not ENV_FILE.exists():
        sys.exit(f"missing env file: {ENV_FILE}")
    url = key = ""
    for raw in ENV_FILE.read_text().splitlines():
        line = raw.strip().lstrip("﻿").rstrip()
        if line.startswith("NEXT_PUBLIC_SUPABASE_URL="):
            url = line.split("=", 1)[1].strip().strip('"')
        elif line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            key = line.split("=", 1)[1].strip().strip('"')
    if not url or not key:
        sys.exit("env missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return url, key


def rest(url: str, key: str, path: str, params: dict | None = None) -> list[dict]:
    qs = urllib.parse.urlencode(params or {}, safe="(),.*")
    full = f"{url}/rest/v1/{path}" + (f"?{qs}" if qs else "")
    req = urllib.request.Request(full, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def days_between(a: str | None, b: str | None) -> int | None:
    if not a or not b:
        return None
    try:
        da = datetime.fromisoformat(a.replace("Z", "+00:00"))
        db = datetime.fromisoformat(b.replace("Z", "+00:00"))
        return abs((db - da).days)
    except (TypeError, ValueError):
        return None


def fetch_property_data(url: str, key: str, property_id: str, since_iso: str) -> dict:
    prop = rest(url, key, "properties", {"id": f"eq.{property_id}", "select": "*"})
    if not prop:
        sys.exit(f"property {property_id} not found")
    p = prop[0]

    units = rest(url, key, "units", {"property_id": f"eq.{property_id}", "select": "*"})
    unit_ids = [u["id"] for u in units]

    leases = []
    if unit_ids:
        leases = rest(url, key, "leases", {
            "unit_id": f"in.({','.join(unit_ids)})",
            "select": "*,tenants(first_name,last_name)",
            "order": "lease_start.desc",
        })

    convos = rest(url, key, "conversations", {
        "property_id": f"eq.{property_id}",
        "created_at": f"gte.{since_iso}",
        "select": "*",
    })

    work_orders = rest(url, key, "work_orders", {
        "property_id": f"eq.{property_id}",
        "created_at": f"gte.{since_iso}",
        "select": "*",
    })

    showings = rest(url, key, "showings", {
        "property_id": f"eq.{property_id}",
        "created_at": f"gte.{since_iso}",
        "select": "*",
    })

    owner_reports = rest(url, key, "owner_reports", {
        "property_id": f"eq.{property_id}",
        "select": "*",
        "order": "period_end.desc",
        "limit": "10",
    })

    return {
        "property": p,
        "units": units,
        "leases": leases,
        "conversations": convos,
        "work_orders": work_orders,
        "showings": showings,
        "owner_reports": owner_reports,
    }


def compute_metrics(data: dict, window_days: int) -> dict:
    units = data["units"]
    occ = sum(1 for u in units if u.get("status") == "occupied")
    vac = sum(1 for u in units if u.get("status") == "vacant")
    convos = data["conversations"]
    ai_handled = sum(1 for c in convos if c.get("status") in ("ai_handling", "closed"))
    escalated = sum(1 for c in convos if c.get("status") == "escalated")
    by_channel = {}
    for c in convos:
        by_channel[c.get("channel", "unknown")] = by_channel.get(c.get("channel", "unknown"), 0) + 1

    work_orders = data["work_orders"]
    completed_wos = [w for w in work_orders if w.get("status") == "completed" and w.get("completed_date")]
    wo_resolution_days = [
        days_between(w.get("created_at"), w.get("completed_date"))
        for w in completed_wos
    ]
    wo_resolution_days = [d for d in wo_resolution_days if d is not None]

    showings = data["showings"]
    completed_showings = sum(1 for s in showings if s.get("status") == "completed")
    no_shows = sum(1 for s in showings if s.get("status") == "no_show")
    ai_scheduled_showings = sum(1 for s in showings if s.get("source") == "ai_chat")

    return {
        "window_days": window_days,
        "unit_count": len(units),
        "occupied_units": occ,
        "vacant_units": vac,
        "occupancy_pct": round(100 * occ / len(units), 1) if units else 0,
        "total_conversations": len(convos),
        "ai_handled": ai_handled,
        "escalated_to_human": escalated,
        "ai_handling_pct": round(100 * ai_handled / len(convos), 1) if convos else 0,
        "conversations_by_channel": by_channel,
        "total_work_orders": len(work_orders),
        "completed_work_orders": len(completed_wos),
        "median_resolution_days": (
            sorted(wo_resolution_days)[len(wo_resolution_days) // 2]
            if wo_resolution_days else None
        ),
        "showings_total": len(showings),
        "showings_completed": completed_showings,
        "showings_no_show": no_shows,
        "showings_ai_scheduled": ai_scheduled_showings,
        "owner_reports_generated": len(data["owner_reports"]),
    }


def render_markdown(data: dict, metrics: dict, window_days: int) -> str:
    p = data["property"]
    name = p.get("name", "Unknown property")
    location = ", ".join(filter(None, [p.get("city"), p.get("state"), p.get("zip")]))
    return f"""---
type: case-study
author: claude
created: {datetime.now().date().isoformat()}
property_id: {p['id']}
window_days: {window_days}
status: draft
---

# Case Study — {name}

**Property:** {name} · {location} · {metrics['unit_count']} units
**Window:** last {window_days} days
**Source:** RKV Consulting Supabase, deterministic extract

---

## At a glance

| Metric | Value |
|---|---|
| Units | {metrics['unit_count']} ({metrics['occupied_units']} occupied · {metrics['vacant_units']} vacant) |
| Occupancy | {metrics['occupancy_pct']}% |
| Conversations handled | {metrics['total_conversations']} ({metrics['ai_handling_pct']}% AI-resolved, {metrics['escalated_to_human']} escalated) |
| Channels | {', '.join(f"{k}: {v}" for k,v in metrics['conversations_by_channel'].items()) or '—'} |
| Work orders | {metrics['total_work_orders']} total · {metrics['completed_work_orders']} completed{f" · median {metrics['median_resolution_days']}d to resolve" if metrics['median_resolution_days'] is not None else " · resolution time N/A (none completed)"} |
| Showings | {metrics['showings_total']} ({metrics['showings_completed']} completed · {metrics['showings_no_show']} no-shows · {metrics['showings_ai_scheduled']} AI-scheduled) |
| Owner reports | {metrics['owner_reports_generated']} generated |

---

## 1. The "before"

[NARRATIVE: describe what running this property looked like before RKV — number of inbound inquiries handled manually, vacancy days per turn, owner-report cadence, hours of owner's time per week. Get this from the owner directly; it is NOT in the database.]

## 2. What RKV did

[NARRATIVE: pull the most representative agent activity log entries from the window and summarize. Include 2–3 specific dated examples — e.g. "On 2026-04-12 at 7:42pm, the leasing agent answered an inbound SMS about Unit 3B's availability and scheduled a showing in 4 minutes."]

## 3. The "after"

Concrete outcomes from the {window_days}-day window:

- **Occupancy held at {metrics['occupancy_pct']}%** ({metrics['occupied_units']}/{metrics['unit_count']} units)
- **{metrics['total_conversations']} tenant/prospect conversations handled** — {metrics['ai_handling_pct']}% closed without human intervention
- **{metrics['completed_work_orders']} work orders completed**, median {metrics['median_resolution_days']} days from open to resolved
- **{metrics['showings_completed']} showings completed**, {metrics['showings_ai_scheduled']} of which were scheduled by the AI leasing agent
- **{metrics['owner_reports_generated']} owner reports** generated

[NARRATIVE: convert these stats into 2–3 punchy lines a PM operator would care about. No fluff. If a number is small (e.g. 0 owner reports), say so honestly.]

## 4. Owner perspective

[NARRATIVE: 2–3 quote-friendly lines the owner would actually say. Get from interview, not invent.]

## 5. Honest limits

[NARRATIVE: name what RKV did NOT solve in this window. What's still manual? What broke? What did the owner have to step in for? A case study without limits reads like marketing — and PM operators smell that instantly.]

---

## Strongest claims (auto-flagged)

[REVIEW: pick the 3 metrics above that best survive scrutiny. A claim survives scrutiny if (a) the underlying row count is ≥ a meaningful sample, and (b) the comparison point is honestly anchored (not "vs nothing").]

## Weakest claims (auto-flagged)

[REVIEW: pick the 3 metrics most exposed. For each, name the data still needed — e.g. "{metrics['total_conversations']} conversations is too small a sample to claim a response-time improvement; need 100+."]

---

*Generated by `generate_case_study.py` on {datetime.now().isoformat(timespec='seconds')}. Re-run after dad's units have 60+ days of real activity for a publishable version.*
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--property-id", required=True)
    ap.add_argument("--window-days", type=int, default=90)
    ap.add_argument("--output", default=None)
    ap.add_argument("--json-out", default=None, help="also write raw extract as JSON")
    args = ap.parse_args()

    url, key = load_env()
    since = (datetime.now(timezone.utc) - timedelta(days=args.window_days)).isoformat()

    data = fetch_property_data(url, key, args.property_id, since)
    metrics = compute_metrics(data, args.window_days)
    md = render_markdown(data, metrics, args.window_days)

    out_path = Path(args.output) if args.output else (
        Path(__file__).parent
        / f"[C]-case-study-{data['property'].get('name', 'unknown').lower().replace(' ', '-')}.md"
    )
    out_path.write_text(md)
    print(f"wrote {out_path}")

    if args.json_out:
        Path(args.json_out).write_text(json.dumps({"data": data, "metrics": metrics}, default=str, indent=2))
        print(f"wrote {args.json_out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
