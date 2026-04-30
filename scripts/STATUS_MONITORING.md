# Status Page & Uptime Monitoring

## Architecture

```
public /status page  ──polls every 30s──▶  /api/status/health   (live multi-component check)
                     ──polls every 30s──▶  /api/status/incidents (last 7d, from DB)
                     ──polls every 30s──▶  /api/status/uptime    (30/90d daily buckets)

vercel cron every 1m ────────────────────▶  /api/cron/status-check
                                              ├─ inserts into status_history
                                              ├─ opens incident if 3 consecutive 'down'
                                              └─ fires Slack/email/Sentry alerts
```

## Vercel cron caveat

`vercel.json` schedules `/api/cron/status-check` at `* * * * *`, but **Vercel Hobby/Pro plans do not allow per-minute crons** (Hobby = daily, Pro = hourly minimum). Options:

1. **Better Stack Uptime** ($0–$20/mo): 50 monitors at 30s intervals, multi-region. Configure to hit `https://rkv-consulting.com/api/status/health` and parse JSON for `overall_status`.
2. **UptimeRobot** (free tier): 50 monitors at 5-min intervals — fine for low-noise alerts.
3. **External cron host** (Hostinger VPS already in inventory): a single-line shell cron pings `/api/cron/status-check` with the `CRON_SECRET` bearer.
4. **Vercel Enterprise**: per-minute crons available.

Until one of those is wired up, the cron in `vercel.json` will run on whatever interval Vercel honours for the current plan; the rest of the pipeline (history insert, incident open, alerts) works regardless of cadence.

## Required env vars

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | DB + auth health check |
| `SUPABASE_SERVICE_ROLE_KEY` | history/incident writes |
| `RESEND_API_KEY` | email alert + reachability check |
| `CRON_SECRET` | cron auth |
| `SLACK_ALERTS_WEBHOOK_URL` *(optional)* | Slack alerts |
| `ALERT_EMAIL` *(optional)* | recipient for outage emails |
| `ALERT_FROM_EMAIL` *(optional)* | from address (defaults `alerts@rkv-consulting.com`) |
| `NEXT_PUBLIC_APP_URL` *(optional)* | absolute URL the cron uses to call `/api/status/health` |

## Load testing

```bash
npm run load-test
LOAD_TEST_URL=https://staging.rkv-consulting.com npm run load-test
LOAD_TEST_CONCURRENCY=100 LOAD_TEST_TOTAL=5000 npm run load-test
```

Defaults: 50 concurrent / 1000 total per endpoint. Exits non-zero if any endpoint exceeds 1% error rate or 3s p95.

For sustained heavy load, use `k6` or `artillery` instead — the script here is a deps-free smoke probe.
