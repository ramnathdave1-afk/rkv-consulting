'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartTooltip } from '@/components/dashboard/ChartTooltip';
import { Skeleton } from '@/components/ui/Skeleton';
import { MarketIntelligencePanel } from '@/components/market/MarketIntelligencePanel';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
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
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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

const WO_STATUS_COLORS: Record<string, string> = {
  open: '#FF4757',
  assigned: '#FFAA33',
  in_progress: '#5B9FFF',
  parts_needed: '#A78BFA',
  completed: '#00E5A0',
  closed: '#6B7280',
  cancelled: '#9CA3AF',
};

const WO_SLICES = [
  { name: 'Open', color: '#FF4757' },
  { name: 'Assigned', color: '#FFAA33' },
  { name: 'In Progress', color: '#5B9FFF' },
  { name: 'Completed', color: '#00E5A0' },
  { name: 'Closed', color: '#6B7280' },
];

function generateSparkline(current: number, variance = 0.15): number[] {
  const points: number[] = [];
  for (let i = 0; i < 12; i++) {
    const factor = 0.7 + (i / 12) * 0.3 + (Math.random() - 0.5) * variance;
    points.push(Math.round(current * factor));
  }
  points.push(current);
  return points;
}

// Static chart data (will be replaced by real API data in production)
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
  { range: '0–30 days', count: 4, pct: 4.7, color: '#FF4757' },
  { range: '30–60 days', count: 7, pct: 8.1, color: '#FFAA33' },
  { range: '60–90 days', count: 12, pct: 14, color: '#5B9FFF' },
  { range: '90+ days', count: 63, pct: 73.2, color: '#00E5A0' },
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

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <div className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { title: 'Total Properties', numericValue: data.totalProperties, value: data.totalProperties, icon: Building2, color: '#00bfa6', trend: { value: 8, label: 'vs last month' }, sparklineData: generateSparkline(data.totalProperties) },
    { title: 'Total Units', numericValue: data.totalUnits, value: data.totalUnits, icon: DoorOpen, color: '#5B9FFF', trend: { value: 5, label: 'vs last month' }, sparklineData: generateSparkline(data.totalUnits) },
    { title: 'Occupancy Rate', numericValue: data.occupancyRate, value: `${data.occupancyRate}%`, icon: Percent, color: '#A78BFA', suffix: '%', format: 'percentage' as const, trend: { value: 2.3, label: 'vs last month' }, sparklineData: generateSparkline(data.occupancyRate, 0.1) },
    { title: 'Monthly Revenue', numericValue: data.monthlyRevenue, value: `$${data.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: '#FFAA33', format: 'currency' as const, trend: { value: 4.1, label: 'vs last month' }, sparklineData: generateSparkline(data.monthlyRevenue) },
    { title: 'Open Requests', numericValue: data.openWorkOrders, value: data.openWorkOrders, icon: Wrench, color: '#FF4757', trend: { value: -12, label: 'vs last month' }, sparklineData: generateSparkline(data.openWorkOrders, 0.3) },
  ];

  const totalWO = Object.values(data.workOrdersByStatus).reduce((a, b) => a + b, 0);
  const woSliceData = Object.entries(data.workOrdersByStatus).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: WO_STATUS_COLORS[status] || '#6B7280',
  }));

  return (
    <div className="p-6 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1
              className="font-display font-extrabold"
              style={{ fontSize: 26, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
            >
              Dashboard
            </h1>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: 'var(--success-muted)',
                border: '1px solid var(--border-accent)',
              }}
            >
              <div className="relative">
                <div className="w-[7px] h-[7px] rounded-full bg-accent" />
                <div
                  className="absolute inset-0 rounded-full bg-accent"
                  style={{ animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }}
                />
              </div>
              <span className="text-[11px] font-bold text-accent uppercase tracking-widest">Live</span>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Real-time overview across your portfolio
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all hover:-translate-y-px"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}>
            <Filter size={14} /> Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all hover:-translate-y-px"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}>
            <Download size={14} /> Export
          </button>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all hover:-translate-y-px"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ════════════ OVERVIEW TAB ════════════ */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Grid — 5 across */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {kpis.map((kpi, i) => (
                  <KPICard key={kpi.title} {...kpi} index={i} />
                ))}
              </div>

              {/* Revenue Chart + Work Orders Pie */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[5fr_2fr]">
                {/* Revenue & Expenses Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card-premium p-6"
                >
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        Revenue & Expenses
                      </h3>
                      <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>7-month trend with NOI</p>
                    </div>
                    <div className="flex gap-4">
                      {[
                        { l: 'Revenue', col: '#00bfa6' },
                        { l: 'Expenses', col: '#A78BFA' },
                        { l: 'NOI', col: '#5B9FFF' },
                      ].map((x) => (
                        <div key={x.l} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ background: x.col }} />
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{x.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={REVENUE_DATA}>
                      <defs>
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00bfa6" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#00bfa6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                      <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} dx={-4} />
                      <Tooltip content={<ChartTooltip formatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />} />
                      <Area type="monotone" dataKey="rev" stroke="#00bfa6" strokeWidth={2.5} fill="url(#gRev)" dot={false} />
                      <Area type="monotone" dataKey="exp" stroke="#A78BFA" strokeWidth={2} fill="url(#gExp)" dot={false} strokeDasharray="6 4" />
                      <Line type="monotone" dataKey="noi" stroke="#5B9FFF" strokeWidth={2} dot={false} strokeDasharray="3 3" />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Work Orders Pie */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card-premium p-6"
                >
                  <h3 className="text-[16px] font-bold mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    Work Orders
                  </h3>
                  <p className="text-[12px] mb-2" style={{ color: 'var(--text-tertiary)' }}>Active distribution</p>
                  {totalWO > 0 && (
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
                              stroke="none"
                              paddingAngle={3}
                            >
                              {woSliceData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-center -mt-2 mb-3">
                        <div className="text-[28px] font-extrabold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{totalWO}</div>
                        <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Total Orders</div>
                      </div>
                      <div className="space-y-2">
                        {woSliceData.map((s) => (
                          <div key={s.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
                              <span className="text-[12px] font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                            </div>
                            <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Work Order Status Bar */}
              {totalWO > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.45 }}
                  className="glass-card-premium p-5"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Work Order Pipeline</h3>
                  <div className="flex gap-2 h-9 rounded-lg overflow-hidden">
                    {Object.entries(data.workOrdersByStatus).map(([status, count]) => {
                      const pct = (count / totalWO) * 100;
                      return (
                        <motion.div
                          key={status}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(pct, 6)}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-md flex items-center justify-center text-[11px] font-bold text-white"
                          style={{ backgroundColor: WO_STATUS_COLORS[status] || '#6B7280' }}
                          title={`${status}: ${count}`}
                        >
                          {pct > 10 ? count : ''}
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-2.5 flex-wrap">
                    {Object.entries(WO_STATUS_COLORS).map(([status, color]) => (
                      <div key={status} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[10px] capitalize" style={{ color: 'var(--text-tertiary)' }}>{status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Activity Feed */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="glass-card-premium p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-accent" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Recent Activity</h3>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-activity-panel'))}
                    className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 transition-colors font-semibold"
                  >
                    View All <ArrowRight size={12} />
                  </button>
                </div>
                <ActivityFeed maxItems={10} compact />
              </motion.div>
            </div>
          )}

          {/* ════════════ FINANCIALS TAB ════════════ */}
          {tab === 'financials' && (
            <div className="space-y-6">
              {/* Revenue Chart Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card-premium p-6"
              >
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      Revenue & NOI Trend
                    </h3>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Monthly breakdown across all properties</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={REVENUE_DATA}>
                    <defs>
                      <linearGradient id="gRevF" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00bfa6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#00bfa6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />} />
                    <Area type="monotone" dataKey="rev" stroke="#00bfa6" strokeWidth={2.5} fill="url(#gRevF)" dot={false} />
                    <Area type="monotone" dataKey="exp" stroke="#A78BFA" strokeWidth={2} fill="none" dot={false} strokeDasharray="6 4" />
                    <Line type="monotone" dataKey="noi" stroke="#5B9FFF" strokeWidth={2.5} dot={{ r: 4, fill: '#5B9FFF', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Lease Expiration + Delinquency */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card-premium p-6"
                >
                  <h3 className="text-[16px] font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Lease Expirations</h3>
                  <p className="text-[12px] mb-5" style={{ color: 'var(--text-tertiary)' }}>Upcoming renewal timeline</p>
                  <div className="space-y-4">
                    {LEASE_EXPIRY.map((le) => (
                      <div key={le.range}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{le.range}</span>
                          <span className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{le.count} leases ({le.pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${le.pct}%` }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full"
                            style={{ background: le.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card-premium p-6"
                >
                  <h3 className="text-[16px] font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Delinquency</h3>
                  <p className="text-[12px] mb-5" style={{ color: 'var(--text-tertiary)' }}>Outstanding balances by aging bucket</p>
                  <div className="space-y-3">
                    {DELINQUENCY.map((d) => (
                      <div key={d.range} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                        <div>
                          <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{d.range} days</div>
                          <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{d.tenants} tenant{d.tenants > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-[18px] font-extrabold" style={{ color: '#FF4757', letterSpacing: '-0.02em' }}>
                          ${d.amt.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Total Outstanding</span>
                      <span className="text-[20px] font-extrabold" style={{ color: '#FF4757', letterSpacing: '-0.02em' }}>
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
              {/* Occupancy Trend */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card-premium p-6"
              >
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      Occupancy Trend
                    </h3>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Portfolio-wide occupancy over time</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={OCCUPANCY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip content={<ChartTooltip formatter={(v: number) => `${v}%`} />} />
                    <Line type="monotone" dataKey="v" stroke="#A78BFA" strokeWidth={3} dot={{ r: 5, fill: '#A78BFA', strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Work Order Pipeline */}
              {totalWO > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card-premium p-6"
                >
                  <h3 className="text-[16px] font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Work Order Pipeline</h3>
                  <p className="text-[12px] mb-5" style={{ color: 'var(--text-tertiary)' }}>Status distribution across all properties</p>
                  <div className="flex gap-2.5 h-10 rounded-xl overflow-hidden mb-4">
                    {Object.entries(data.workOrdersByStatus).map(([status, count]) => {
                      const pct = (count / totalWO) * 100;
                      return (
                        <motion.div
                          key={status}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(pct, 6)}%` }}
                          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                          className="rounded-lg flex items-center justify-center text-[12px] font-bold text-white"
                          style={{ backgroundColor: WO_STATUS_COLORS[status] || '#6B7280' }}
                        >
                          {pct > 10 ? count : ''}
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(data.workOrdersByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                        <div className="w-3 h-3 rounded-sm" style={{ background: WO_STATUS_COLORS[status] || '#6B7280' }} />
                        <div>
                          <div className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{count}</div>
                          <div className="text-[10px] capitalize" style={{ color: 'var(--text-tertiary)' }}>{status.replace('_', ' ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Activity Feed */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="glass-card-premium p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-accent" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Activity Feed</h3>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-activity-panel'))}
                    className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 transition-colors font-semibold"
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
              {/* Market Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {MARKET_STATS.map((stat, i) => {
                    const StatIcon = stat.icon;
                    return (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="glass-card-premium p-5"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)' }}>
                            <StatIcon size={16} className="text-accent" />
                          </div>
                          <span className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</span>
                        </div>
                        <div className="text-[22px] font-extrabold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stat.val}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {stat.up ? <ArrowUp size={12} className="text-green-500" /> : <ArrowDown size={12} className="text-red-500" />}
                          <span className="text-[12px] font-bold" style={{ color: stat.up ? 'var(--success)' : 'var(--danger)' }}>{stat.change}</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>vs last year</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Market Intelligence Panel */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="glass-card-premium p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-accent" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Market Intelligence</h3>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMarketDropdownOpen(!marketDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:border-accent/40"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-hover)' }}
                    >
                      {selectedMarket.city}, {selectedMarket.state}
                      <ChevronDown size={12} className={`transition-transform ${marketDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                    {marketDropdownOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 z-20 w-48 py-1 rounded-xl border shadow-xl"
                        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                      >
                        {MARKET_OPTIONS.map((market) => (
                          <button
                            key={`${market.city}-${market.state}`}
                            onClick={() => { setSelectedMarket(market); setMarketDropdownOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs transition-colors"
                            style={{
                              color: selectedMarket.city === market.city ? 'var(--accent)' : 'var(--text-secondary)',
                              background: selectedMarket.city === market.city ? 'var(--accent-muted)' : 'transparent',
                            }}
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="glass-card-premium p-8 text-center"
        >
          <Building2 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to RKV Consulting</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Get started by adding your first property, or connect your PM platform to import data automatically.
          </p>
          <div className="flex justify-center gap-3">
            <a href="/properties" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #00bfa6, #00A8A0)' }}>
              Add Property
            </a>
            <a href="/integrations" className="px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:-translate-y-px"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Connect PM Platform
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
