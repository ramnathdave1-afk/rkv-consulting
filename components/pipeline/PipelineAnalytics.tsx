'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  DollarSign, TrendingUp, Clock, Award, Zap, Loader2,
} from 'lucide-react';
import { toast } from '@/components/ui/Toast';

interface KPIs {
  totalDeals: number;
  totalPipelineValue: number;
  winRate: number;
  avgDaysToClose: number;
  pipelineVelocity: number;
  closedCount: number;
}

interface FunnelItem { stage: string; count: number }
interface StageTimingItem { stage: string; avgDays: number; count: number }
interface SourceMetric { source: string; totalDeals: number; closedDeals: number; closeRate: number; totalValue: number }
interface MonthlyTrend { month: string; label: string; newDeals: number; closed: number; dead: number }
interface ValueByStage { stage: string; value: number }

interface AnalyticsData {
  kpis: KPIs;
  funnel: FunnelItem[];
  stageTiming: StageTimingItem[];
  sourceMetrics: SourceMetric[];
  monthlyTrends: MonthlyTrend[];
  valueByStage: ValueByStage[];
}

const STAGE_LABELS: Record<string, string> = {
  lead: 'Watching',
  analyzing: 'Analyzing',
  offer_sent: 'Offer Sent',
  under_contract: 'Under Contract',
  due_diligence: 'Due Diligence',
  closing: 'Closing',
  closed: 'Closed',
  dead: 'Passed',
};

const COLORS = ['#c9a84c', '#4A6080', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#ef4444'];
const PIE_COLORS = ['#c9a84c', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#4A6080', '#ef4444'];

const fmt = (v: number) => `$${v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString()}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-[#1a1a1a] px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} className="text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="text-white font-medium">{typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function PipelineAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crm/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-slate-500">
        No analytics data available
      </div>
    );
  }

  const { kpis, funnel, stageTiming, sourceMetrics, monthlyTrends, valueByStage } = data;

  const kpiCards = [
    { label: 'Pipeline Value', value: fmt(kpis.totalPipelineValue), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Win Rate', value: `${kpis.winRate}%`, icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Avg Days to Close', value: String(kpis.avgDaysToClose), icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Pipeline Velocity', value: fmt(kpis.pipelineVelocity) + '/mo', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Deals', value: String(kpis.totalDeals), icon: TrendingUp, color: 'text-slate-300', bg: 'bg-slate-500/10' },
    { label: 'Closed Deals', value: String(kpis.closedCount), icon: Award, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  const funnelData = funnel.map((f) => ({ ...f, stage: STAGE_LABELS[f.stage] || f.stage }));
  const timingData = stageTiming.filter((s) => s.avgDays > 0).map((s) => ({ ...s, stage: STAGE_LABELS[s.stage] || s.stage }));
  const valueData = valueByStage.filter((v) => v.value > 0).map((v) => ({ ...v, stage: STAGE_LABELS[v.stage] || v.stage }));
  const sourcePie = sourceMetrics.filter((s) => s.totalDeals > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-slate-800 bg-[#111111] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`${card.bg} rounded-lg p-1.5`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
                <span className="text-[11px] text-slate-500 font-medium">{card.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="rounded-xl border border-slate-800 bg-[#111111] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Deals" radius={[0, 4, 4, 0]}>
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stage Timing */}
        <div className="rounded-xl border border-slate-800 bg-[#111111] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Avg Days per Stage</h3>
          {timingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timingData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis type="category" dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="avgDays" name="Avg Days" fill="#c9a84c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-slate-500">
              Move deals between stages to generate timing data
            </div>
          )}
        </div>

        {/* Source ROI */}
        <div className="rounded-xl border border-slate-800 bg-[#111111] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Deals by Source</h3>
          {sourcePie.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={sourcePie}
                    dataKey="totalDeals"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    strokeWidth={0}
                  >
                    {sourcePie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {sourcePie.map((s, i) => (
                  <div key={s.source} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {s.source}
                    </span>
                    <span className="text-slate-500">
                      {s.totalDeals} deals · {s.closeRate}% close
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-slate-500">
              Add deal sources to see breakdown
            </div>
          )}
        </div>

        {/* Pipeline Value by Stage */}
        <div className="rounded-xl border border-slate-800 bg-[#111111] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Pipeline Value by Stage</h3>
          {valueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={valueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="stage" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Value" fill="#c9a84c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-slate-500">
              Add deals with prices to see value distribution
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends — full width */}
      <div className="rounded-xl border border-slate-800 bg-[#111111] p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Monthly Deal Trends (12 months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar dataKey="newDeals" name="New" fill="#c9a84c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="closed" name="Closed" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="dead" name="Passed" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Source Detail Table */}
      {sourceMetrics.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-[#111111] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Source Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2.5 px-4 text-xs text-slate-400 font-medium">Source</th>
                  <th className="text-right py-2.5 px-4 text-xs text-slate-400 font-medium">Total Deals</th>
                  <th className="text-right py-2.5 px-4 text-xs text-slate-400 font-medium">Closed</th>
                  <th className="text-right py-2.5 px-4 text-xs text-slate-400 font-medium">Close Rate</th>
                  <th className="text-right py-2.5 px-4 text-xs text-slate-400 font-medium">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {sourceMetrics.map((s) => (
                  <tr key={s.source} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="py-2 px-4 text-slate-300">{s.source}</td>
                    <td className="py-2 px-4 text-right text-slate-400">{s.totalDeals}</td>
                    <td className="py-2 px-4 text-right text-green-400">{s.closedDeals}</td>
                    <td className="py-2 px-4 text-right text-slate-300">{s.closeRate}%</td>
                    <td className="py-2 px-4 text-right text-[#c9a84c] font-medium">{fmt(s.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
