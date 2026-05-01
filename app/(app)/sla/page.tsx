'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartTooltip } from '@/components/dashboard/ChartTooltip';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  TrendingUp,
  Timer,
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
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617] tracking-tight">SLA Performance</h1>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            {summary?.total ?? 0} tracked · {summary?.open ?? 0} open · {breachedOpen.length} currently breached
          </p>
        </div>
        <Link
          href="/settings/sla"
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#020617] hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Settings size={14} /> Manage policies
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={CheckCircle2}
          label="Acknowledge Rate"
          value={stats.ackRate}
          sub={`avg ${stats.avgAck}`}
        />
        <KpiCard
          icon={Clock}
          label="First Response"
          value={stats.respRate}
          sub={`avg ${stats.avgResp}`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Resolution Rate"
          value={stats.resolveRate}
          sub={`avg ${stats.avgResolve}`}
        />
        <KpiCard
          icon={Timer}
          label="Avg Resolve Time"
          value={stats.avgResolve}
          sub="across all priorities"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Open Breaches"
          value={String(breachedOpen.length)}
          sub={`${summary?.acknowledge_breaches ?? 0} ack · ${summary?.first_response_breaches ?? 0} resp · ${summary?.resolve_breaches ?? 0} resolve`}
          tone={breachedOpen.length > 0 ? 'danger' : 'ok'}
        />
      </div>

      {/* Trend chart */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#020617]">Breaches per Week</h2>
            <p className="text-xs text-slate-500 mt-0.5">Total tickets vs SLA breaches over the last 8 weeks</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0F172A]" />
              <span className="text-xs text-slate-500">Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0369A1]" />
              <span className="text-xs text-slate-500">Breaches</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip />} />
              <Bar dataKey="total" fill="#0F172A" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="breaches" fill="#0369A1" name="Breaches" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breached table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#020617]">
            Open & Breached <span className="ml-1 text-slate-500 font-medium tabular-nums">({breachedOpen.length})</span>
          </h2>
        </div>
        {breachedOpen.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-slate-500">Nothing breached. Nice work.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase text-slate-500 tracking-wider">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Priority</th>
                  <th className="px-5 py-3 font-medium">Opened</th>
                  <th className="px-5 py-3 font-medium">Ack</th>
                  <th className="px-5 py-3 font-medium">First Resp.</th>
                  <th className="px-5 py-3 font-medium">Resolve</th>
                  <th className="px-5 py-3 font-medium">Policy</th>
                </tr>
              </thead>
              <tbody>
                {breachedOpen.slice(0, 50).map((e) => {
                  // Past-SLA = acknowledge breach + still open. At-risk = first-response breach but not ack breach.
                  const pastSla = e.acknowledge_breached || e.resolve_breached;
                  const atRisk = !pastSla && e.first_response_breached;
                  const rowBg = pastSla
                    ? 'bg-red-50 hover:bg-red-100'
                    : atRisk
                      ? 'bg-amber-50 hover:bg-amber-100'
                      : 'hover:bg-slate-50';
                  return (
                    <tr key={e.id} className={`border-b border-slate-100 last:border-0 transition-colors ${rowBg}`}>
                      <td className="px-5 py-3 font-mono text-xs text-[#020617]">{e.resource_type}</td>
                      <td className="px-5 py-3">
                        {e.priority ? (
                          <PriorityBadge priority={e.priority} />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600 tabular-nums text-xs">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <BreachCell breached={e.acknowledge_breached} stamped={!!e.acknowledged_at} />
                      </td>
                      <td className="px-5 py-3">
                        <BreachCell breached={e.first_response_breached} stamped={!!e.first_response_at} />
                      </td>
                      <td className="px-5 py-3">
                        <BreachCell breached={e.resolve_breached} stamped={!!e.resolved_at} />
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {e.sla_policies?.name ?? 'No policy'}
                      </td>
                    </tr>
                  );
                })}
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
  tone = 'ok',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: 'ok' | 'danger';
}) {
  const iconBg = tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-[#0369A1]';
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-[#020617]">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
        <div className={`p-2 rounded-md ${iconBg}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const lower = priority.toLowerCase();
  const cls =
    lower === 'critical' || lower === 'urgent' || lower === 'high'
      ? 'bg-red-50 text-red-700 border-red-200'
      : lower === 'medium' || lower === 'normal'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-sky-50 text-[#0369A1] border-sky-200';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${cls}`}>
      {priority}
    </span>
  );
}

function BreachCell({ breached, stamped }: { breached: boolean; stamped: boolean }) {
  if (breached) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        Breached
      </span>
    );
  }
  if (stamped) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        On time
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      Pending
    </span>
  );
}
