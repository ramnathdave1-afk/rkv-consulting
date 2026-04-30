'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceStatus = 'operational' | 'degraded' | 'down';
type OverallStatus = 'operational' | 'partial_outage' | 'major_outage';

type ComponentKey = 'database' | 'auth' | 'email' | 'sms' | 'payments' | 'ai';

interface ComponentResult {
  status: ServiceStatus;
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  overall_status: OverallStatus;
  components: Record<ComponentKey, ComponentResult>;
  timestamp: string;
}

interface IncidentUpdate {
  timestamp: string;
  status: string;
  message: string;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  severity: string;
  affected_components: string[];
  created_at: string;
  resolved_at: string | null;
  updates: IncidentUpdate[];
}

interface UptimeBucket {
  date: string; // YYYY-MM-DD
  status: ServiceStatus;
  downtime_pct: number;
}

interface UptimeData {
  components: Record<ComponentKey, UptimeBucket[]>;
  uptime_30d: Record<ComponentKey, number>;
  uptime_90d: Record<ComponentKey, number>;
}

const SERVICE_LABELS: Record<ComponentKey, { label: string; meta: string }> = {
  database: { label: 'Database (Supabase)', meta: 'Postgres + auth' },
  auth: { label: 'Web App + API', meta: 'app.rkv-consulting.com' },
  email: { label: 'Email (Resend)', meta: 'Transactional + outreach' },
  sms: { label: 'SMS (Twilio)', meta: 'Tenant + leasing SMS' },
  payments: { label: 'Payments (Stripe)', meta: 'Subscriptions + billing' },
  ai: { label: 'AI (Anthropic)', meta: 'Claude — leasing/maintenance/finance agents' },
};

const ORDER: ComponentKey[] = ['auth', 'database', 'email', 'sms', 'payments', 'ai'];

function statusIcon(s: ServiceStatus) {
  if (s === 'operational') return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (s === 'degraded') return <AlertTriangle size={16} className="text-amber-400" />;
  return <XCircle size={16} className="text-red-400" />;
}

function statusLabel(s: ServiceStatus) {
  return s === 'operational' ? 'Operational' : s === 'degraded' ? 'Degraded' : 'Down';
}

function statusColorText(s: ServiceStatus) {
  return s === 'operational'
    ? 'text-emerald-400'
    : s === 'degraded'
      ? 'text-amber-400'
      : 'text-red-400';
}

function barColor(s: ServiceStatus) {
  return s === 'operational' ? 'bg-emerald-400/80 hover:bg-emerald-400'
    : s === 'degraded' ? 'bg-amber-400/80 hover:bg-amber-400'
    : 'bg-red-400/80 hover:bg-red-400';
}

function generateLast30Days(): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });
  }
  return out;
}

function UptimeBars({
  serviceKey,
  buckets,
}: {
  serviceKey: ComponentKey;
  buckets: UptimeBucket[] | undefined;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const days = useMemo(() => generateLast30Days(), []);
  const byDate = useMemo(() => {
    const map = new Map<string, UptimeBucket>();
    (buckets ?? []).forEach((b) => map.set(b.date, b));
    return map;
  }, [buckets]);

  return (
    <div className="flex items-center gap-[2px] relative">
      {days.map(({ date, label }, i) => {
        const bucket = byDate.get(date);
        const dayStatus: ServiceStatus = bucket?.status ?? 'operational';
        const downtimePct = bucket?.downtime_pct ?? 0;
        return (
          <div
            key={`${serviceKey}-${i}`}
            className="relative"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={cn(
                'w-[8px] h-[28px] rounded-[2px] cursor-pointer transition-colors',
                barColor(dayStatus),
              )}
            />
            {hoveredIndex === i && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2 shadow-xl whitespace-nowrap">
                  <p className="text-[11px] font-medium text-text-primary">{label}</p>
                  <p className={cn('text-[10px]', statusColorText(dayStatus))}>
                    {(100 - downtimePct).toFixed(2)}% uptime
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [uptime, setUptime] = useState<UptimeData | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [healthRes, incidentsRes, uptimeRes] = await Promise.all([
        fetch('/api/status/health', { cache: 'no-store' }),
        fetch('/api/status/incidents', { cache: 'no-store' }).catch(() => null),
        fetch('/api/status/uptime', { cache: 'no-store' }).catch(() => null),
      ]);

      if (healthRes.ok) {
        setHealth(await healthRes.json());
      }
      if (incidentsRes && incidentsRes.ok) {
        const data = await incidentsRes.json();
        setIncidents(data.incidents ?? []);
      }
      if (uptimeRes && uptimeRes.ok) {
        const data = await uptimeRes.json();
        setUptime(data);
      }
      setLastFetch(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const overall: OverallStatus = health?.overall_status ?? 'operational';
  const overall90d = useMemo(() => {
    if (!uptime) return 99.98;
    const vals = Object.values(uptime.uptime_90d);
    if (!vals.length) return 99.98;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [uptime]);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">R</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">RKV Consulting</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={refresh}
              className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
              aria-label="Refresh status"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/"
              className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Back to site
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4">
            <Activity size={20} className="text-text-muted" />
            <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">
              System Status
            </h1>
          </div>

          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
              overall === 'operational' && 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
              overall === 'partial_outage' && 'bg-amber-400/10 text-amber-400 border border-amber-400/20',
              overall === 'major_outage' && 'bg-red-400/10 text-red-400 border border-red-400/20',
            )}
          >
            {overall === 'operational' ? (
              <>
                <CheckCircle2 size={16} /> All Systems Operational
              </>
            ) : overall === 'partial_outage' ? (
              <>
                <AlertTriangle size={16} /> Partial Outage
              </>
            ) : (
              <>
                <XCircle size={16} /> Major Outage
              </>
            )}
          </div>

          <p className="mt-4 text-sm text-text-secondary">
            <span className="font-mono font-semibold text-text-primary">
              {overall90d.toFixed(2)}%
            </span>{' '}
            uptime &mdash; last 90 days
          </p>
          {lastFetch && (
            <p className="mt-1 text-[11px] text-text-muted">
              Last checked {lastFetch.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Services */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-bg-secondary/40 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Components
            </h2>
            <div className="flex items-center gap-4 text-[10px] text-text-muted">
              <span>30 days ago</span>
              <span className="flex-1" />
              <span>Today</span>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {ORDER.map((key) => {
              const comp: ComponentResult = health?.components?.[key] ?? { status: 'operational' };
              const meta = SERVICE_LABELS[key];
              const u30 = uptime?.uptime_30d?.[key];
              return (
                <div
                  key={key}
                  className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-bg-elevated/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 sm:w-[260px] shrink-0">
                    {statusIcon(comp.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{meta.label}</p>
                      <p className={cn('text-[11px] font-medium', statusColorText(comp.status))}>
                        {statusLabel(comp.status)}
                        {typeof comp.latency_ms === 'number' && (
                          <span className="text-text-muted ml-1.5">· {comp.latency_ms}ms</span>
                        )}
                        {typeof u30 === 'number' && (
                          <span className="text-text-muted ml-1.5">
                            · {u30.toFixed(2)}% 30d
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <UptimeBars serviceKey={key} buckets={uptime?.components?.[key]} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-bg-secondary/40 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Clock size={13} />
              Recent Incidents (past 7 days)
            </h2>
          </div>
          {incidents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-400/40 mb-3" />
              <p className="text-sm text-text-secondary">
                No incidents reported in the last 7 days.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {incidents.map((inc) => (
                <div key={inc.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold',
                            inc.severity === 'critical'
                              ? 'border-red-500/30 bg-red-500/10 text-red-400'
                              : inc.severity === 'major'
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                : 'border-sky-500/30 bg-sky-500/10 text-sky-400',
                          )}
                        >
                          {inc.severity}
                        </span>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold',
                            inc.status === 'resolved'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-400',
                          )}
                        >
                          {inc.status}
                        </span>
                        {inc.affected_components.map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-secondary"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      <h3 className="mt-1 text-sm font-semibold text-text-primary">{inc.title}</h3>
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        {new Date(inc.created_at).toLocaleString()}
                        {inc.resolved_at &&
                          ` · resolved ${new Date(inc.resolved_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  {(inc.updates ?? []).slice(-2).map((u, i) => (
                    <div key={i} className="mt-2 rounded-lg bg-bg-primary/60 px-3 py-2">
                      <p className="text-[10px] text-text-muted uppercase">
                        {u.status} · {new Date(u.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">{u.message}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-16">
        <p className="text-center text-xs text-text-muted">
          Status auto-refreshes every 30 seconds.
        </p>
      </div>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} RKV Consulting by RKV. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
