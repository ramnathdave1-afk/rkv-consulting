'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SlaPolicySummary {
  name: string;
  acknowledge_within_min: number | null;
  first_response_within_min: number | null;
  resolve_within_min: number | null;
}

interface SlaEvent {
  id: string;
  resource_type: string;
  resource_id: string;
  priority: string | null;
  created_at: string;
  acknowledged_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  acknowledge_breached: boolean;
  first_response_breached: boolean;
  resolve_breached: boolean;
  sla_policies: SlaPolicySummary | null;
}

interface Summary {
  total: number;
  acknowledge_breaches: number;
  first_response_breaches: number;
  resolve_breaches: number;
  resolved: number;
  open: number;
}

function pctRate(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function avgMinutes(values: number[]): string {
  if (values.length === 0) return '—';
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg < 60) return `${Math.round(avg)}m`;
  if (avg < 60 * 24) return `${(avg / 60).toFixed(1)}h`;
  return `${(avg / 60 / 24).toFixed(1)}d`;
}

export default function SlaDashboardPage() {
  const [events, setEvents] = useState<SlaEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/sla/events?limit=500');
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events ?? []);
        setSummary(json.summary ?? null);
      }
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const ackTimes: number[] = [];
    const respTimes: number[] = [];
    const resolveTimes: number[] = [];
    for (const e of events) {
      const created = new Date(e.created_at).getTime();
      if (e.acknowledged_at) ackTimes.push((new Date(e.acknowledged_at).getTime() - created) / 60_000);
      if (e.first_response_at) respTimes.push((new Date(e.first_response_at).getTime() - created) / 60_000);
      if (e.resolved_at) resolveTimes.push((new Date(e.resolved_at).getTime() - created) / 60_000);
    }
    const ackTotal = events.filter((e) => e.acknowledged_at).length;
    const respTotal = events.filter((e) => e.first_response_at).length;
    const resolveTotal = events.filter((e) => e.resolved_at).length;
    return {
      ackRate: pctRate(ackTotal - events.filter((e) => e.acknowledge_breached).length, ackTotal),
      respRate: pctRate(respTotal - events.filter((e) => e.first_response_breached).length, respTotal),
      resolveRate: pctRate(resolveTotal - events.filter((e) => e.resolve_breached).length, resolveTotal),
      avgAck: avgMinutes(ackTimes),
      avgResp: avgMinutes(respTimes),
      avgResolve: avgMinutes(resolveTimes),
    };
  }, [events]);

  const breachedOpen = events.filter(
    (e) =>
      !e.resolved_at &&
      (e.acknowledge_breached || e.first_response_breached || e.resolve_breached),
  );

  // Weekly breach trend (last 8 weeks)
  const trendData = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { week: string; breaches: number; total: number }> = {};
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      buckets[label] = { week: label, breaches: 0, total: 0 };
    }
    for (const e of events) {
      const d = new Date(e.created_at);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 56) continue;
      const weeksAgo = Math.floor(diffDays / 7);
      const start = new Date(now);
      start.setDate(start.getDate() - weeksAgo * 7);
      const label = `${start.getMonth() + 1}/${start.getDate()}`;
      if (!buckets[label]) continue;
      buckets[label].total += 1;
      if (e.acknowledge_breached || e.first_response_breached || e.resolve_breached) {
        buckets[label].breaches += 1;
      }
    }
    return Object.values(buckets);
  }, [events]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">SLA Performance</h1>
          <p className="text-sm text-text-secondary">
            {summary?.total ?? 0} tracked resources · {summary?.open ?? 0} open · {breachedOpen.length} currently breached
          </p>
        </div>
        <Link
          href="/settings/sla"
          className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <Settings size={14} /> Manage policies
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CheckCircle2} label="Acknowledge rate" value={stats.ackRate} sub={`avg ${stats.avgAck}`} tone="ok" />
        <KpiCard icon={Clock} label="First response rate" value={stats.respRate} sub={`avg ${stats.avgResp}`} tone="ok" />
        <KpiCard icon={TrendingUp} label="Resolution rate" value={stats.resolveRate} sub={`avg ${stats.avgResolve}`} tone="ok" />
        <KpiCard
          icon={AlertTriangle}
          label="Open breaches"
          value={String(breachedOpen.length)}
          sub={`${summary?.acknowledge_breaches ?? 0} ack · ${summary?.first_response_breaches ?? 0} resp · ${summary?.resolve_breaches ?? 0} resolve`}
          tone={breachedOpen.length > 0 ? 'danger' : 'ok'}
        />
      </div>

      {/* Trend chart */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Breaches per week</h2>
          <span className="text-xs text-text-muted">last 8 weeks</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#3B82F6" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="breaches" fill="#EF4444" name="Breaches" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breached table */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-text-primary mb-3">
          Open & breached ({breachedOpen.length})
        </h2>
        {breachedOpen.length === 0 ? (
          <p className="text-sm text-text-muted">Nothing breached. Nice work.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-text-muted border-b border-border">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Opened</th>
                  <th className="py-2 pr-4">Ack</th>
                  <th className="py-2 pr-4">First resp.</th>
                  <th className="py-2 pr-4">Resolve</th>
                  <th className="py-2 pr-4">Policy</th>
                </tr>
              </thead>
              <tbody>
                {breachedOpen.slice(0, 50).map((e) => (
                  <tr key={e.id} className="border-b border-border/40">
                    <td className="py-2 pr-4 font-mono text-xs">{e.resource_type}</td>
                    <td className="py-2 pr-4">{e.priority ?? '—'}</td>
                    <td className="py-2 pr-4">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <BreachCell breached={e.acknowledge_breached} stamped={!!e.acknowledged_at} />
                    </td>
                    <td className="py-2 pr-4">
                      <BreachCell breached={e.first_response_breached} stamped={!!e.first_response_at} />
                    </td>
                    <td className="py-2 pr-4">
                      <BreachCell breached={e.resolve_breached} stamped={!!e.resolved_at} />
                    </td>
                    <td className="py-2 pr-4 text-xs text-text-muted">
                      {e.sla_policies?.name ?? 'No policy'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone: 'ok' | 'danger';
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={tone === 'danger' ? 'text-danger' : 'text-accent'} />
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="font-display text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-muted mt-1">{sub}</div>
    </div>
  );
}

function BreachCell({ breached, stamped }: { breached: boolean; stamped: boolean }) {
  if (breached) return <span className="text-danger font-semibold">Breached</span>;
  if (stamped) return <span className="text-accent">On time</span>;
  return <span className="text-text-muted">Pending</span>;
}
