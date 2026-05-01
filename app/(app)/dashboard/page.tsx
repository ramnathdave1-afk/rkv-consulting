'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartTooltip } from '@/components/dashboard/ChartTooltip';
import { Skeleton } from '@/components/ui/Skeleton';
import { MarketIntelligencePanel } from '@/components/market/MarketIntelligencePanel';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { GettingStartedChecklist } from '@/components/dashboard/GettingStartedChecklist';
import { LocationFilter } from '@/components/settings/LocationFilter';
import { useLocations } from '@/lib/hooks/useLocations';
import {
  Building2,
  DoorOpen,
  Percent,
  Wrench,
  DollarSign,
  Globe,
  ChevronDown,
  Activity,
  ArrowRight,
  Filter,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Home,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  openWorkOrders: number;
  expiringLeases30d: number;
  monthlyRevenue: number;
  workOrdersByStatus: Record<string, number>;
}

// Sales Intelligence palette
const SI_PRIMARY = '#0369A1';   // sky-700
const SI_NAVY = '#0F172A';      // slate-900
const SI_TEXT = '#020617';      // slate-950

// Accessible palette for status / pie / bar
const PIE_PALETTE = ['#0369A1', '#0F172A', '#059669', '#d97706', '#7c3aed', '#0284C7', '#dc2626', '#64748b'];

const WO_STATUS_COLORS: Record<string, string> = {
  open: '#dc2626',
  assigned: '#d97706',
  in_progress: '#0369A1',
  parts_needed: '#7c3aed',
  completed: '#059669',
  closed: '#64748b',
  cancelled: '#94a3b8',
};

function generateSparkline(current: number, variance = 0.15): number[] {
  const points: number[] = [];
  for (let i = 0; i < 12; i++) {
    const factor = 0.7 + (i / 12) * 0.3 + (Math.random() - 0.5) * variance;
    points.push(Math.round(current * factor));
  }
  points.push(current);
  return points;
}

// Static chart data (replaced by real API data in production)
const REVENUE_DATA = [
  { m: 'Sep', rev: 142000, exp: 89000, noi: 53000 },
  { m: 'Oct', rev: 155000, exp: 92000, noi: 63000 },
  { m: 'Nov', rev: 148000, exp: 87000, noi: 61000 },
  { m: 'Dec', rev: 162000, exp: 95000, noi: 67000 },
  { m: 'Jan', rev: 158000, exp: 91000, noi: 67000 },
  { m: 'Feb', rev: 171000, exp: 88000, noi: 83000 },
  { m: 'Mar', rev: 185000, exp: 93000, noi: 92000 },
];

const OCCUPANCY_DATA = [
  { m: 'Sep', v: 89 }, { m: 'Oct', v: 91 }, { m: 'Nov', v: 88 },
  { m: 'Dec', v: 92 }, { m: 'Jan', v: 90 }, { m: 'Feb', v: 93 }, { m: 'Mar', v: 96 },
];

const LEASE_EXPIRY = [
  { range: '0–30 days', count: 4, pct: 4.7, color: '#dc2626' },
  { range: '30–60 days', count: 7, pct: 8.1, color: '#d97706' },
  { range: '60–90 days', count: 12, pct: 14, color: '#0369A1' },
  { range: '90+ days', count: 63, pct: 73.2, color: '#059669' },
];

const DELINQUENCY = [
  { range: '0–30', amt: 4200, tenants: 3 },
  { range: '30–60', amt: 8500, tenants: 2 },
  { range: '60–90', amt: 3200, tenants: 1 },
  { range: '90+', amt: 6800, tenants: 1 },
];

const MARKET_OPTIONS = [
  { city: 'Phoenix', state: 'AZ', zip: '85001' },
  { city: 'Dallas', state: 'TX', zip: '75201' },
  { city: 'Atlanta', state: 'GA', zip: '30301' },
  { city: 'Tampa', state: 'FL', zip: '33601' },
  { city: 'Charlotte', state: 'NC', zip: '28201' },
  { city: 'Nashville', state: 'TN', zip: '37201' },
  { city: 'Austin', state: 'TX', zip: '73301' },
  { city: 'Las Vegas', state: 'NV', zip: '89101' },
  { city: 'Denver', state: 'CO', zip: '80201' },
  { city: 'Raleigh', state: 'NC', zip: '27601' },
];

const MARKET_STATS = [
  { label: 'Median Home Price', val: '$425,000', change: '+3.2%', up: true, icon: Home },
  { label: 'Median Rent', val: '$1,650', change: '+5.1%', up: true, icon: DollarSign },
  { label: 'Vacancy Rate', val: '4.8%', change: '-0.6%', up: false, icon: Layers },
  { label: 'YoY Appreciation', val: '7.2%', change: '+1.1%', up: true, icon: TrendingUp },
];

const TABS = ['overview', 'financials', 'operations', 'market'] as const;
type Tab = (typeof TABS)[number];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedMarket, setSelectedMarket] = useState(MARKET_OPTIONS[0]);
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);
  const supabase = createClient();

  const { activeLocationId, activeLocation } = useLocations();

  const fetchDashboard = useCallback(async () => {
    try {
      const url = activeLocationId
        ? `/api/dashboard?location_id=${encodeURIComponent(activeLocationId)}`
        : '/api/dashboard';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeLocationId]);

  useEffect(() => {
    fetchDashboard();

    const channel = supabase
      .channel('pm-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => fetchDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => fetchDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => fetchDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, () => fetchDashboard())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-lg lg:col-span-2" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { title: 'Total Properties', numericValue: data.totalProperties, value: data.totalProperties, icon: Building2, trend: { value: 8, label: 'vs last period' }, sparklineData: generateSparkline(data.totalProperties) },
    { title: 'Total Units', numericValue: data.totalUnits, value: data.totalUnits, icon: DoorOpen, trend: { value: 5, label: 'vs last period' }, sparklineData: generateSparkline(data.totalUnits) },
    { title: 'Occupancy Rate', numericValue: data.occupancyRate, value: `${data.occupancyRate}%`, icon: Percent, suffix: '%', format: 'percentage' as const, trend: { value: 2.3, label: 'vs last period' }, sparklineData: generateSparkline(data.occupancyRate, 0.1) },
    { title: 'Monthly Revenue', numericValue: data.monthlyRevenue, value: `$${data.monthlyRevenue.toLocaleString()}`, icon: DollarSign, format: 'currency' as const, trend: { value: 4.1, label: 'vs last period' }, sparklineData: generateSparkline(data.monthlyRevenue) },
    { title: 'Open Requests', numericValue: data.openWorkOrders, value: data.openWorkOrders, icon: Wrench, trend: { value: -12, label: 'vs last period' }, sparklineData: generateSparkline(data.openWorkOrders, 0.3) },
  ];

  const totalWO = Object.values(data.workOrdersByStatus).reduce((a, b) => a + b, 0);
  const woSliceData = Object.entries(data.workOrdersByStatus).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: WO_STATUS_COLORS[status] || '#64748b',
  }));

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
      <GettingStartedChecklist />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#020617]">
              Dashboard
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              <div className="relative">
                <div className="w-[7px] h-[7px] rounded-full bg-emerald-500" />
                <div
                  className="absolute inset-0 rounded-full bg-emerald-500"
                  style={{ animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }}
                />
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Live</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {activeLocationId
              ? `Live data for ${activeLocation?.name || 'this location'}`
              : 'Real-time overview across your portfolio'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <LocationFilter />
          <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#020617] hover:border-slate-300 transition-colors shadow-sm">
            <Filter size={14} /> Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#020617] hover:border-slate-300 transition-colors shadow-sm">
            <Download size={14} /> Export
          </button>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:text-[#020617] hover:border-slate-300 transition-colors shadow-sm"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t
                ? 'border-[#0369A1] text-[#0369A1]'
                : 'border-transparent text-slate-500 hover:text-[#020617]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ════════════ OVERVIEW TAB ════════════ */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {kpis.map((kpi, i) => (
                  <KPICard key={kpi.title} {...kpi} index={i} />
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Add Property', icon: Building2, href: '/properties' },
                  { label: 'New Lease', icon: DoorOpen, href: '/leases' },
                  { label: 'Generate Report', icon: Download, href: '/reports' },
                  { label: 'View Activity', icon: Activity, href: '#', onClick: () => window.dispatchEvent(new CustomEvent('open-activity-panel')) },
                ].map((q) => {
                  const QIcon = q.icon;
                  const inner = (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer flex items-center gap-3">
                      <div className="p-2 rounded-md bg-sky-50 text-[#0369A1]">
                        <QIcon size={18} />
                      </div>
                      <span className="text-sm font-semibold text-[#020617]">{q.label}</span>
                    </div>
                  );
                  return q.onClick ? (
                    <button key={q.label} onClick={q.onClick} className="text-left">{inner}</button>
                  ) : (
                    <a key={q.label} href={q.href}>{inner}</a>
                  );
                })}
              </div>

              {/* Revenue Chart full-width below KPIs */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
              >
                <div className="flex justify-between items-baseline mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#020617]">Revenue & Expenses</h3>
                    <p className="text-xs text-slate-500 mt-0.5">7-month trend with NOI</p>
                  </div>
                  <div className="flex gap-4">
                    {[
                      { l: 'Revenue', col: SI_PRIMARY },
                      { l: 'Expenses', col: SI_NAVY },
                      { l: 'NOI', col: '#059669' },
                    ].map((x) => (
                      <div key={x.l} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: x.col }} />
                        <span className="text-xs font-medium text-slate-500">{x.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SI_PRIMARY} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={SI_PRIMARY} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SI_NAVY} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={SI_NAVY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />} />
                    <Area type="monotone" dataKey="rev" name="Revenue" stroke={SI_PRIMARY} strokeWidth={2.5} fill="url(#gRev)" dot={false} />
                    <Area type="monotone" dataKey="exp" name="Expenses" stroke={SI_NAVY} strokeWidth={2} fill="url(#gExp)" dot={false} />
                    <Line type="monotone" dataKey="noi" name="NOI" stroke="#059669" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Work Orders Pie + Status Bar */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[5fr_2fr]">
                {/* Activity Feed */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-[#0369A1]" />
                      <h3 className="text-sm font-semibold text-[#020617]">Recent Activity</h3>
                    </div>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-activity-panel'))}
                      className="flex items-center gap-1 text-xs text-[#0369A1] hover:text-[#075985] transition-colors font-semibold"
                    >
                      View All <ArrowRight size={12} />
                    </button>
                  </div>
                  <ActivityFeed maxItems={10} compact />
                </motion.div>

                {/* Work Orders Pie */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-sm font-semibold text-[#020617]">Work Orders</h3>
                  <p className="text-xs text-slate-500 mb-3">Active distribution</p>
                  {totalWO > 0 ? (
                    <>
                      <div className="flex justify-center">
                        <ResponsiveContainer width={180} height={180}>
                          <PieChart>
                            <Pie
                              data={woSliceData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              dataKey="value"
                              stroke="#fff"
                              strokeWidth={2}
                              paddingAngle={2}
                            >
                              {woSliceData.map((entry, i) => (
                                <Cell key={i} fill={entry.color || PIE_PALETTE[i % PIE_PALETTE.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-center -mt-2 mb-3">
                        <div className="font-display text-2xl font-bold tabular-nums text-[#020617]">{totalWO}</div>
                        <div className="text-xs text-slate-500">Total Orders</div>
                      </div>
                      <div className="space-y-1.5">
                        {woSliceData.map((s) => (
                          <div key={s.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                              <span className="text-xs font-medium capitalize text-slate-600">{s.name}</span>
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-[#020617]">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-8">No active work orders</p>
                  )}
                </motion.div>
              </div>

              {/* Work Order Status Bar */}
              {totalWO > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                  className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Work Order Pipeline</h3>
                  <div className="flex gap-2 h-9 rounded-md overflow-hidden">
                    {Object.entries(data.workOrdersByStatus).map(([status, count]) => {
                      const pct = (count / totalWO) * 100;
                      return (
                        <motion.div
                          key={status}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(pct, 6)}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-sm flex items-center justify-center text-xs font-semibold text-white tabular-nums"
                          style={{ backgroundColor: WO_STATUS_COLORS[status] || '#64748b' }}
                          title={`${status}: ${count}`}
                        >
                          {pct > 10 ? count : ''}
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {Object.entries(WO_STATUS_COLORS).map(([status, color]) => (
                      <div key={status} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[11px] capitalize text-slate-500">{status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* ════════════ FINANCIALS TAB ════════════ */}
          {tab === 'financials' && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
              >
                <div className="flex justify-between items-baseline mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#020617]">Revenue & NOI Trend</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Monthly breakdown across all properties</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="gRevF" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SI_PRIMARY} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={SI_PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />} />
                    <Area type="monotone" dataKey="rev" name="Revenue" stroke={SI_PRIMARY} strokeWidth={2.5} fill="url(#gRevF)" dot={false} />
                    <Area type="monotone" dataKey="exp" name="Expenses" stroke={SI_NAVY} strokeWidth={2} fill="none" dot={false} strokeDasharray="6 4" />
                    <Line type="monotone" dataKey="noi" name="NOI" stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-sm font-semibold text-[#020617]">Lease Expirations</h3>
                  <p className="text-xs text-slate-500 mb-4">Upcoming renewal timeline</p>
                  <div className="space-y-4">
                    {LEASE_EXPIRY.map((le) => (
                      <div key={le.range}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-600">{le.range}</span>
                          <span className="text-sm font-semibold tabular-nums text-[#020617]">
                            {le.count} leases <span className="text-slate-500 font-normal">({le.pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-slate-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${le.pct}%` }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full"
                            style={{ background: le.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-sm font-semibold text-[#020617]">Delinquency</h3>
                  <p className="text-xs text-slate-500 mb-4">Outstanding balances by aging bucket</p>
                  <div className="space-y-2">
                    {DELINQUENCY.map((d) => (
                      <div key={d.range} className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-100">
                        <div>
                          <div className="text-sm font-semibold text-[#020617]">{d.range} days</div>
                          <div className="text-xs text-slate-500">{d.tenants} tenant{d.tenants > 1 ? 's' : ''}</div>
                        </div>
                        <div className="font-display text-lg font-bold tabular-nums text-red-600">
                          ${d.amt.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-semibold text-slate-600">Total Outstanding</span>
                      <span className="font-display text-xl font-bold tabular-nums text-red-600">
                        ${DELINQUENCY.reduce((a, d) => a + d.amt, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {/* ════════════ OPERATIONS TAB ════════════ */}
          {tab === 'operations' && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
              >
                <div className="flex justify-between items-baseline mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#020617]">Occupancy Trend</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Portfolio-wide occupancy over time</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={OCCUPANCY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} />
                    <Line type="monotone" dataKey="v" name="Occupancy" stroke={SI_PRIMARY} strokeWidth={2.5} dot={{ r: 4, fill: SI_PRIMARY, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {totalWO > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
                >
                  <h3 className="text-sm font-semibold text-[#020617]">Work Order Pipeline</h3>
                  <p className="text-xs text-slate-500 mb-4">Status distribution across all properties</p>
                  <div className="flex gap-2 h-10 rounded-md overflow-hidden mb-4">
                    {Object.entries(data.workOrdersByStatus).map(([status, count]) => {
                      const pct = (count / totalWO) * 100;
                      return (
                        <motion.div
                          key={status}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(pct, 6)}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-sm flex items-center justify-center text-xs font-semibold text-white tabular-nums"
                          style={{ backgroundColor: WO_STATUS_COLORS[status] || '#64748b' }}
                        >
                          {pct > 10 ? count : ''}
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(data.workOrdersByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2 p-3 rounded-md bg-slate-50 border border-slate-100">
                        <div className="w-3 h-3 rounded-sm" style={{ background: WO_STATUS_COLORS[status] || '#64748b' }} />
                        <div>
                          <div className="text-base font-bold tabular-nums text-[#020617]">{count}</div>
                          <div className="text-[10px] capitalize text-slate-500">{status.replace('_', ' ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-[#0369A1]" />
                    <h3 className="text-sm font-semibold text-[#020617]">Activity Feed</h3>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-activity-panel'))}
                    className="flex items-center gap-1 text-xs text-[#0369A1] hover:text-[#075985] transition-colors font-semibold"
                  >
                    View All <ArrowRight size={12} />
                  </button>
                </div>
                <ActivityFeed maxItems={15} compact />
              </motion.div>
            </div>
          )}

          {/* ════════════ MARKET TAB ════════════ */}
          {tab === 'market' && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {MARKET_STATS.map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.4 }}
                        className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#020617]">{stat.val}</p>
                            <div className="mt-2 flex items-center gap-1 text-xs">
                              {stat.up ? <ArrowUp size={12} className="text-emerald-600" /> : <ArrowDown size={12} className="text-red-600" />}
                              <span className={`font-semibold tabular-nums ${stat.up ? 'text-emerald-600' : 'text-red-600'}`}>{stat.change}</span>
                              <span className="text-slate-500">vs last year</span>
                            </div>
                          </div>
                          <div className="p-2 rounded-md bg-sky-50 text-[#0369A1]">
                            <StatIcon size={20} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-[#0369A1]" />
                    <h3 className="text-sm font-semibold text-[#020617]">Market Intelligence</h3>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-[#020617] hover:border-slate-300 transition-colors shadow-sm"
                    >
                      {selectedMarket.city}, {selectedMarket.state}
                      <ChevronDown size={12} className={`text-slate-400 transition-transform ${marketDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {marketDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 py-1 rounded-md border border-slate-200 bg-white shadow-lg">
                        {MARKET_OPTIONS.map((market) => (
                          <button
                            key={`${market.city}-${market.state}`}
                            onClick={() => { setSelectedMarket(market); setMarketDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              selectedMarket.city === market.city
                                ? 'text-[#0369A1] bg-sky-50 font-semibold'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {market.city}, {market.state}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <MarketIntelligencePanel
                  city={selectedMarket.city}
                  state={selectedMarket.state}
                  zip={selectedMarket.zip}
                />
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Empty state */}
      {data.totalProperties === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center"
        >
          <div className="mx-auto w-12 h-12 rounded-md bg-sky-50 text-[#0369A1] flex items-center justify-center mb-4">
            <Building2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-[#020617] mb-2">Welcome to RKV Consulting</h3>
          <p className="text-sm text-slate-500 mb-4">
            Get started by adding your first property, or connect your PM platform to import data automatically.
          </p>
          <div className="flex justify-center gap-3">
            <a href="/properties" className="px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-[#0369A1] hover:bg-[#075985] transition-colors shadow-sm">
              Add Property
            </a>
            <a href="/integrations" className="px-5 py-2.5 rounded-md border border-slate-200 bg-white text-sm font-semibold text-[#020617] hover:bg-slate-50 transition-colors shadow-sm">
              Connect PM Platform
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
