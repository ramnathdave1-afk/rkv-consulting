'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/reports/RevenueChart';
import { ExpenseBreakdown } from '@/components/reports/ExpenseBreakdown';
import { PropertyRevenue } from '@/components/reports/PropertyRevenue';
import { GenerateReportModal } from '@/components/reports/GenerateReportModal';
import { LocationFilter } from '@/components/settings/LocationFilter';
import { useLocations } from '@/lib/hooks/useLocations';
import {
  DollarSign,
  TrendingDown,
  BarChart3,
  Percent,
  Home,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  Download,
  Trash2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import type { FinancialKPIs } from '@/lib/types';

type Tab = 'overview' | 'rent_roll' | 'property_table' | 'per_location' | 'expirations' | 'reports';

interface PerLocationRow {
  location_id: string | null;
  location_name: string;
  property_count: number;
  unit_count: number;
  occupied_units: number;
  occupancy_rate: number;
  active_leases: number;
  monthly_rent: number;
  open_work_orders: number;
}
type Period = 'current_month' | 'last_month' | 'quarter' | 'year';

interface PropertyTableRow {
  property_id: string;
  property_name: string;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number;
  revenue: number;
  expenses: number;
  noi: number;
  avg_rent: number;
}

interface RentRollEntry {
  id: string;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  property_name: string;
  unit_number: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string;
  deposit_amount: number;
  status: string;
}

interface ExpiringLease {
  id: string;
  lease_end: string;
  monthly_rent: number;
  status: string;
  units: { unit_number: string; properties: { name: string } | null } | null;
  tenants: { first_name: string; last_name: string } | null;
}

interface OwnerReportRow {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  pdf_url: string | null;
  total_income: number | null;
  total_expenses: number | null;
  net_operating_income: number | null;
  created_at: string;
  properties: { name: string } | null;
}

interface FinancialData {
  kpis: FinancialKPIs;
  monthly_trend: { month: string; income: number; expenses: number }[];
  expense_breakdown: { category: string; amount: number }[];
  revenue_by_property: { property_name: string; amount: number }[];
  property_table: PropertyTableRow[];
  expiring_leases: ExpiringLease[];
  rent_roll: RentRollEntry[];
  properties: { id: string; name: string }[];
  period: { start: string; end: string; label: string };
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'Year to Date' },
];

export default function ReportsPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<Period>('current_month');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [reports, setReports] = useState<OwnerReportRow[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [rentRollSearch, setRentRollSearch] = useState('');
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [perLocation, setPerLocation] = useState<PerLocationRow[]>([]);

  const supabase = createClient();
  const { activeLocationId } = useLocations();

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const params = new URLSearchParams({ period });
      if (propertyFilter) params.set('property_id', propertyFilter);
      if (activeLocationId) params.set('location_id', activeLocationId);

      const [financialsRes, reportsRes, perLocRes] = await Promise.all([
        fetch(`/api/reports/financials?${params}`).then((r) => r.json()),
        supabase
          .from('owner_reports')
          .select('id, report_type, period_start, period_end, pdf_url, total_income, total_expenses, net_operating_income, created_at, properties(name)')
          .eq('org_id', profile.org_id)
          .order('created_at', { ascending: false })
          .limit(20),
        fetch('/api/reports/per-location').then((r) => r.json()).catch(() => ({ items: [] })),
      ]);

      setData(financialsRes);
      setReports((reportsRes.data || []) as OwnerReportRow[]);
      setPerLocation((perLocRes?.items as PerLocationRow[]) || []);
    } catch (err) {
      console.error('Failed to fetch financial data:', err);
      toast.error('Failed to load financial data');
    }

    setLoading(false);
    setRefreshing(false);
  }, [supabase, period, propertyFilter, activeLocationId]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  async function handleDeleteReport(reportId: string) {
    setDeletingReportId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        toast.success('Report deleted');
      } else {
        toast.error('Failed to delete report');
      }
    } catch {
      toast.error('Network error');
    }
    setDeletingReportId(null);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { title: 'Total Revenue', numericValue: data.kpis.total_revenue_mtd, value: `$${data.kpis.total_revenue_mtd.toLocaleString()}`, icon: DollarSign, format: 'currency' as const, sparklineData: data.monthly_trend.map((m) => m.income) },
    { title: 'Total Expenses', numericValue: data.kpis.total_expenses_mtd, value: `$${data.kpis.total_expenses_mtd.toLocaleString()}`, icon: TrendingDown, format: 'currency' as const, sparklineData: data.monthly_trend.map((m) => m.expenses) },
    { title: 'Net Operating Income', numericValue: data.kpis.noi_mtd, value: `$${data.kpis.noi_mtd.toLocaleString()}`, icon: BarChart3, format: 'currency' as const, sparklineData: data.monthly_trend.map((m) => m.income - m.expenses) },
    { title: 'Occupancy Rate', numericValue: data.kpis.occupancy_rate, value: `${data.kpis.occupancy_rate}%`, icon: Percent, format: 'percentage' as const, sparklineData: [] as number[] },
    { title: 'Avg Rent / Unit', numericValue: data.kpis.avg_rent_per_unit, value: `$${data.kpis.avg_rent_per_unit.toLocaleString()}`, icon: Home, format: 'currency' as const, sparklineData: [] as number[] },
    { title: 'Delinquency Rate', numericValue: data.kpis.delinquency_rate, value: `${data.kpis.delinquency_rate}%`, icon: AlertTriangle, format: 'percentage' as const, sparklineData: [] as number[] },
  ];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'property_table', label: 'Per-Property', count: data.property_table.length },
    { key: 'per_location', label: 'Per-Location', count: perLocation.length },
    { key: 'rent_roll', label: 'Rent Roll', count: data.rent_roll.length },
    { key: 'expirations', label: 'Expirations', count: data.expiring_leases.length },
    { key: 'reports', label: 'Generated Reports', count: reports.length },
  ];

  const filteredRentRoll = rentRollSearch
    ? data.rent_roll.filter((r) =>
        r.tenant_name.toLowerCase().includes(rentRollSearch.toLowerCase()) ||
        r.property_name.toLowerCase().includes(rentRollSearch.toLowerCase()) ||
        r.unit_number.toLowerCase().includes(rentRollSearch.toLowerCase())
      )
    : data.rent_roll;

  const totalMonthlyRent = data.rent_roll.reduce((s, r) => s + r.monthly_rent, 0);

  const inputClass = 'pl-8 pr-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-[#020617] focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] focus:outline-none appearance-none cursor-pointer shadow-sm';

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617] tracking-tight">Financial Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Portfolio financial overview
            {data.period && (
              <span className="text-slate-400 tabular-nums"> &mdash; {data.period.start} to {data.period.end}</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={inputClass}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <LocationFilter />

        <div className="relative">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">All Properties</option>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-[#020617] hover:border-slate-300 transition-colors disabled:opacity-50 shadow-sm"
            title="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#075985] transition-colors shadow-sm"
          >
            <FileText size={16} />
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} {...kpi} index={i} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key
                ? 'border-[#0369A1] text-[#0369A1]'
                : 'border-transparent text-slate-500 hover:text-[#020617]'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
                tab === t.key ? 'bg-sky-100 text-[#0369A1]' : 'bg-slate-100 text-slate-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <RevenueChart data={data.monthly_trend} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExpenseBreakdown data={data.expense_breakdown} />
            <PropertyRevenue data={data.revenue_by_property} />
          </div>
        </motion.div>
      )}

      {tab === 'property_table' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {data.property_table.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No property data available for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Property</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Units</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Occupancy</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Avg Rent</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Revenue</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Expenses</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">NOI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.property_table.map((row) => (
                      <tr key={row.property_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[#020617] font-medium">{row.property_name}</td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          <span className="text-[#020617] font-semibold">{row.occupied_units}</span>
                          <span className="text-slate-400">/{row.total_units}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums border ${
                            row.occupancy_rate >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            row.occupancy_rate >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {row.occupancy_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-right tabular-nums">${row.avg_rent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-600 text-right font-semibold tabular-nums">${row.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600 text-right tabular-nums">${row.expenses.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.noi >= 0 ? 'text-[#0369A1]' : 'text-red-600'}`}>
                          ${row.noi.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="px-4 py-3 text-[#020617] font-semibold">Totals</td>
                      <td className="px-4 py-3 text-[#020617] text-center font-semibold tabular-nums">
                        {data.property_table.reduce((s, r) => s + r.occupied_units, 0)}/{data.property_table.reduce((s, r) => s + r.total_units, 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[#020617] font-semibold tabular-nums">{data.kpis.occupancy_rate}%</span>
                      </td>
                      <td className="px-4 py-3 text-[#020617] text-right font-semibold tabular-nums">${data.kpis.avg_rent_per_unit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-emerald-600 text-right font-bold tabular-nums">
                        ${data.property_table.reduce((s, r) => s + r.revenue, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-red-600 text-right font-bold tabular-nums">
                        ${data.property_table.reduce((s, r) => s + r.expenses, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[#0369A1] text-right font-bold tabular-nums">
                        ${data.property_table.reduce((s, r) => s + r.noi, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'per_location' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
            {perLocation.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Building2 size={36} className="mx-auto mb-3 text-slate-300" />
                No locations to compare yet. Add a location in <a href="/settings/locations" className="text-[#0369A1] hover:underline font-medium">Settings → Locations</a>.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="text-left p-3 font-medium">Location</th>
                    <th className="text-right p-3 font-medium">Properties</th>
                    <th className="text-right p-3 font-medium">Units</th>
                    <th className="text-right p-3 font-medium">Occupied</th>
                    <th className="text-right p-3 font-medium">Occupancy</th>
                    <th className="text-right p-3 font-medium">Active Leases</th>
                    <th className="text-right p-3 font-medium">Monthly Rent</th>
                    <th className="text-right p-3 font-medium">Open WOs</th>
                  </tr>
                </thead>
                <tbody>
                  {perLocation.map((row) => (
                    <tr key={row.location_id || 'unassigned'} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-[#020617]">{row.location_name}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">{row.property_count}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">{row.unit_count}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">{row.occupied_units}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">{row.occupancy_rate}%</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">{row.active_leases}</td>
                      <td className="p-3 text-right text-[#0369A1] font-semibold tabular-nums">${row.monthly_rent.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-600 tabular-nums">{row.open_work_orders}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td className="p-3 text-[#020617]">Total</td>
                    <td className="p-3 text-right tabular-nums">{perLocation.reduce((s, r) => s + r.property_count, 0)}</td>
                    <td className="p-3 text-right tabular-nums">{perLocation.reduce((s, r) => s + r.unit_count, 0)}</td>
                    <td className="p-3 text-right tabular-nums">{perLocation.reduce((s, r) => s + r.occupied_units, 0)}</td>
                    <td className="p-3 text-right">—</td>
                    <td className="p-3 text-right tabular-nums">{perLocation.reduce((s, r) => s + r.active_leases, 0)}</td>
                    <td className="p-3 text-right text-[#0369A1] tabular-nums">${perLocation.reduce((s, r) => s + r.monthly_rent, 0).toLocaleString()}</td>
                    <td className="p-3 text-right tabular-nums">{perLocation.reduce((s, r) => s + r.open_work_orders, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'rent_roll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Summary mini-cards + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white border border-slate-200 rounded-md shadow-sm px-4 py-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Active Leases</p>
                <p className="text-lg font-bold text-[#020617] tabular-nums">{data.rent_roll.length}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-md shadow-sm px-4 py-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total Monthly Rent</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">${totalMonthlyRent.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-md shadow-sm px-4 py-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Annualized</p>
                <p className="text-lg font-bold text-[#0369A1] tabular-nums">${(totalMonthlyRent * 12).toLocaleString()}</p>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenants, properties..."
                value={rentRollSearch}
                onChange={(e) => setRentRollSearch(e.target.value)}
                className="pl-8 pr-3 py-2 w-64 rounded-md border border-slate-200 bg-white text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] focus:outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {filteredRentRoll.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                {rentRollSearch ? 'No matching leases found.' : 'No active leases found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Property / Unit</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Monthly Rent</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Deposit</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Lease Start</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Lease End</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRentRoll.map((entry) => {
                      const daysLeft = Math.ceil((new Date(entry.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const expiringSoon = daysLeft <= 90 && daysLeft > 0;
                      return (
                        <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-[#020617] font-medium">{entry.tenant_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-600">{entry.property_name}</p>
                            <p className="text-[10px] text-slate-400">Unit {entry.unit_number}</p>
                          </td>
                          <td className="px-4 py-3 text-emerald-600 text-right font-semibold tabular-nums">
                            ${entry.monthly_rent.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-right tabular-nums">
                            ${entry.deposit_amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-sm tabular-nums">{entry.lease_start}</td>
                          <td className="px-4 py-3">
                            <span className={`tabular-nums ${expiringSoon ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                              {entry.lease_end}
                            </span>
                            {expiringSoon && (
                              <p className="text-[10px] text-amber-600 tabular-nums">{daysLeft}d remaining</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {entry.tenant_email && (
                              <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{entry.tenant_email}</p>
                            )}
                            {entry.tenant_phone && (
                              <p className="text-[10px] text-slate-500 tabular-nums">{entry.tenant_phone}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="px-4 py-3 text-[#020617] font-semibold" colSpan={2}>
                        Total ({filteredRentRoll.length} leases)
                      </td>
                      <td className="px-4 py-3 text-emerald-600 text-right font-bold tabular-nums">
                        ${filteredRentRoll.reduce((s, r) => s + r.monthly_rent, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-right font-semibold tabular-nums">
                        ${filteredRentRoll.reduce((s, r) => s + r.deposit_amount, 0).toLocaleString()}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'expirations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {data.expiring_leases.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No leases expiring in the next 90 days.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Property / Unit</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Rent</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Expires</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Days Left</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expiring_leases.map((l) => {
                      const daysLeft = Math.ceil((new Date(l.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const urgencyColor = daysLeft <= 14 ? 'text-red-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-600';
                      const riskLabel = daysLeft <= 14 ? 'Critical' : daysLeft <= 30 ? 'High' : daysLeft <= 60 ? 'Medium' : 'Low';
                      const riskBg =
                        daysLeft <= 14
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : daysLeft <= 30
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : daysLeft <= 60
                              ? 'bg-sky-50 text-[#0369A1] border-sky-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      const rowBg = daysLeft <= 14 ? 'bg-red-50/40' : daysLeft <= 30 ? 'bg-amber-50/40' : '';
                      return (
                        <tr key={l.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${rowBg}`}>
                          <td className="px-4 py-3 text-[#020617] font-medium">
                            {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {l.units?.properties?.name || '—'} / {l.units?.unit_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-right tabular-nums">${Number(l.monthly_rent).toLocaleString()}/mo</td>
                          <td className="px-4 py-3 text-slate-600 tabular-nums">{l.lease_end}</td>
                          <td className={`px-4 py-3 font-semibold tabular-nums ${urgencyColor}`}>{daysLeft}d</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${riskBg}`}>
                              {riskLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'reports' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Previously generated owner reports and financial summaries.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-50 text-[#0369A1] text-xs font-semibold hover:bg-sky-100 transition-colors"
            >
              <FileText size={14} />
              New Report
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {reports.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-md bg-sky-50 text-[#0369A1] flex items-center justify-center mb-3">
                  <FileText size={24} />
                </div>
                <p className="text-sm text-slate-500">No reports generated yet.</p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="mt-3 text-sm text-[#0369A1] hover:underline font-medium"
                >
                  Generate your first report
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Property</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Income</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Expenses</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">NOI</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Generated</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[#020617] font-medium">{r.properties?.name || 'Portfolio'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-sky-50 text-[#0369A1] border-sky-200 capitalize">
                            {r.report_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs tabular-nums">{r.period_start} to {r.period_end}</td>
                        <td className="px-4 py-3 text-emerald-600 text-right tabular-nums">
                          {r.total_income != null ? `$${r.total_income.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-red-600 text-right tabular-nums">
                          {r.total_expenses != null ? `$${r.total_expenses.toLocaleString()}` : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${(r.net_operating_income || 0) >= 0 ? 'text-[#0369A1]' : 'text-red-600'}`}>
                          {r.net_operating_income != null ? `$${r.net_operating_income.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs tabular-nums">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.pdf_url && (
                              <a
                                href={r.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-md hover:bg-sky-50 text-[#0369A1] transition-colors"
                                title="Download PDF"
                              >
                                <Download size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteReport(r.id)}
                              disabled={deletingReportId === r.id}
                              className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Delete report"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={() => {
          toast.success('Owner report generated successfully');
          setShowGenerateModal(false);
          fetchData(true);
        }}
      />
    </div>
  );
}
