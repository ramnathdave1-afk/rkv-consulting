'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/reports/RevenueChart';
import { ExpenseBreakdown } from '@/components/reports/ExpenseBreakdown';
import { PropertyRevenue } from '@/components/reports/PropertyRevenue';
import { GenerateReportModal } from '@/components/reports/GenerateReportModal';
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

type Tab = 'overview' | 'rent_roll' | 'property_table' | 'expirations' | 'reports';
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

  const supabase = createClient();

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const params = new URLSearchParams({ period });
      if (propertyFilter) params.set('property_id', propertyFilter);

      const [financialsRes, reportsRes] = await Promise.all([
        fetch(`/api/reports/financials?${params}`).then((r) => r.json()),
        supabase
          .from('owner_reports')
          .select('id, report_type, period_start, period_end, pdf_url, total_income, total_expenses, net_operating_income, created_at, properties(name)')
          .eq('org_id', profile.org_id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setData(financialsRes);
      setReports((reportsRes.data || []) as OwnerReportRow[]);
    } catch (err) {
      console.error('Failed to fetch financial data:', err);
      toast.error('Failed to load financial data');
    }

    setLoading(false);
    setRefreshing(false);
  }, [supabase, period, propertyFilter]);

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
      <div className="p-6 space-y-6">
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
    { title: 'Total Revenue', numericValue: data.kpis.total_revenue_mtd, value: `$${data.kpis.total_revenue_mtd.toLocaleString()}`, icon: DollarSign, color: '#22C55E', sparklineData: data.monthly_trend.map((m) => m.income) },
    { title: 'Total Expenses', numericValue: data.kpis.total_expenses_mtd, value: `$${data.kpis.total_expenses_mtd.toLocaleString()}`, icon: TrendingDown, color: '#EF4444', sparklineData: data.monthly_trend.map((m) => m.expenses) },
    { title: 'Net Operating Income', numericValue: data.kpis.noi_mtd, value: `$${data.kpis.noi_mtd.toLocaleString()}`, icon: BarChart3, color: '#00D4AA', sparklineData: data.monthly_trend.map((m) => m.income - m.expenses) },
    { title: 'Occupancy Rate', numericValue: data.kpis.occupancy_rate, value: `${data.kpis.occupancy_rate}%`, icon: Percent, color: '#3B82F6', sparklineData: [] as number[] },
    { title: 'Avg Rent / Unit', numericValue: data.kpis.avg_rent_per_unit, value: `$${data.kpis.avg_rent_per_unit.toLocaleString()}`, icon: Home, color: '#8A00FF', sparklineData: [] as number[] },
    { title: 'Delinquency Rate', numericValue: data.kpis.delinquency_rate, value: `${data.kpis.delinquency_rate}%`, icon: AlertTriangle, color: data.kpis.delinquency_rate > 10 ? '#EF4444' : '#F59E0B', sparklineData: [] as number[] },
  ];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'property_table', label: 'Per-Property', count: data.property_table.length },
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Financial Reports</h1>
          <p className="text-sm text-text-secondary">
            Portfolio financial overview
            {data.period && (
              <span className="text-text-muted"> &mdash; {data.period.start} to {data.period.end}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="pl-8 pr-3 py-2 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary focus:border-accent focus:outline-none appearance-none cursor-pointer"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Property Filter */}
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary focus:border-accent focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Properties</option>
              {data.properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-border bg-bg-secondary text-text-muted hover:text-text-primary hover:border-border-hover transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          {/* Generate Report */}
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <FileText size={16} />
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} {...kpi} index={i} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                tab === t.key ? 'bg-accent/20 text-accent' : 'bg-bg-elevated text-text-muted'
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
          <div className="glass-card overflow-hidden">
            {data.property_table.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">No property data available for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-center">Units</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-center">Occupancy</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Avg Rent</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Revenue</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Expenses</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">NOI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.property_table.map((row) => (
                      <tr key={row.property_id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{row.property_name}</td>
                        <td className="px-4 py-3 text-text-secondary text-center">
                          <span className="text-text-primary font-medium">{row.occupied_units}</span>
                          <span className="text-text-muted">/{row.total_units}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.occupancy_rate >= 90 ? 'bg-green-500/10 text-green-400' :
                            row.occupancy_rate >= 70 ? 'bg-yellow-500/10 text-yellow-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {row.occupancy_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-right">${row.avg_rent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-green-400 text-right font-medium">${row.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-400 text-right">${row.expenses.toLocaleString()}</td>
                        <td className={`px-4 py-3 text-right font-medium ${row.noi >= 0 ? 'text-accent' : 'text-red-400'}`}>
                          ${row.noi.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-bg-elevated/30">
                      <td className="px-4 py-3 text-text-primary font-semibold">Totals</td>
                      <td className="px-4 py-3 text-text-primary text-center font-medium">
                        {data.property_table.reduce((s, r) => s + r.occupied_units, 0)}/{data.property_table.reduce((s, r) => s + r.total_units, 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-text-primary font-medium">{data.kpis.occupancy_rate}%</span>
                      </td>
                      <td className="px-4 py-3 text-text-primary text-right font-medium">${data.kpis.avg_rent_per_unit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-400 text-right font-semibold">
                        ${data.property_table.reduce((s, r) => s + r.revenue, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-red-400 text-right font-semibold">
                        ${data.property_table.reduce((s, r) => s + r.expenses, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-accent text-right font-semibold">
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

      {tab === 'rent_roll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Rent roll summary + search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="glass-card px-4 py-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Active Leases</p>
                <p className="text-lg font-bold text-text-primary">{data.rent_roll.length}</p>
              </div>
              <div className="glass-card px-4 py-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Total Monthly Rent</p>
                <p className="text-lg font-bold text-green-400">${totalMonthlyRent.toLocaleString()}</p>
              </div>
              <div className="glass-card px-4 py-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Annualized</p>
                <p className="text-lg font-bold text-accent">${(totalMonthlyRent * 12).toLocaleString()}</p>
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search tenants, properties..."
                value={rentRollSearch}
                onChange={(e) => setRentRollSearch(e.target.value)}
                className="pl-8 pr-3 py-2 w-64 rounded-lg border border-border bg-bg-secondary text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            {filteredRentRoll.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                {rentRollSearch ? 'No matching leases found.' : 'No active leases found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Tenant</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property / Unit</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Monthly Rent</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Deposit</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Lease Start</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Lease End</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRentRoll.map((entry) => {
                      const daysLeft = Math.ceil((new Date(entry.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const expiringSoon = daysLeft <= 90 && daysLeft > 0;
                      return (
                        <tr key={entry.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-text-primary font-medium">{entry.tenant_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-text-secondary">{entry.property_name}</p>
                            <p className="text-[10px] text-text-muted">Unit {entry.unit_number}</p>
                          </td>
                          <td className="px-4 py-3 text-green-400 text-right font-medium">
                            ${entry.monthly_rent.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-right">
                            ${entry.deposit_amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-sm">{entry.lease_start}</td>
                          <td className="px-4 py-3">
                            <span className={expiringSoon ? 'text-yellow-400' : 'text-text-secondary'}>
                              {entry.lease_end}
                            </span>
                            {expiringSoon && (
                              <p className="text-[10px] text-yellow-400">{daysLeft}d remaining</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {entry.tenant_email && (
                              <p className="text-[10px] text-text-muted truncate max-w-[140px]">{entry.tenant_email}</p>
                            )}
                            {entry.tenant_phone && (
                              <p className="text-[10px] text-text-muted">{entry.tenant_phone}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-bg-elevated/30">
                      <td className="px-4 py-3 text-text-primary font-semibold" colSpan={2}>
                        Total ({filteredRentRoll.length} leases)
                      </td>
                      <td className="px-4 py-3 text-green-400 text-right font-semibold">
                        ${filteredRentRoll.reduce((s, r) => s + r.monthly_rent, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-right font-medium">
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
          <div className="glass-card overflow-hidden">
            {data.expiring_leases.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">No leases expiring in the next 90 days.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Tenant</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property / Unit</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Rent</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Expires</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Days Left</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expiring_leases.map((l) => {
                      const daysLeft = Math.ceil((new Date(l.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const urgencyColor = daysLeft <= 14 ? 'text-red-400' : daysLeft <= 30 ? 'text-yellow-400' : 'text-text-secondary';
                      const riskLabel = daysLeft <= 14 ? 'Critical' : daysLeft <= 30 ? 'High' : daysLeft <= 60 ? 'Medium' : 'Low';
                      const riskBg = daysLeft <= 14 ? 'bg-red-500/10 text-red-400' : daysLeft <= 30 ? 'bg-yellow-500/10 text-yellow-400' : daysLeft <= 60 ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400';
                      return (
                        <tr key={l.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                          <td className="px-4 py-3 text-text-primary font-medium">
                            {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {l.units?.properties?.name || '—'} / {l.units?.unit_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-text-secondary text-right">${Number(l.monthly_rent).toLocaleString()}/mo</td>
                          <td className="px-4 py-3 text-text-secondary">{l.lease_end}</td>
                          <td className={`px-4 py-3 font-medium ${urgencyColor}`}>{daysLeft}d</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${riskBg}`}>
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
            <p className="text-sm text-text-secondary">
              Previously generated owner reports and financial summaries.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
            >
              <FileText size={14} />
              New Report
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            {reports.length === 0 ? (
              <div className="p-8 text-center">
                <FileText size={32} className="mx-auto text-text-muted mb-3" />
                <p className="text-sm text-text-muted">No reports generated yet.</p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="mt-3 text-sm text-accent hover:underline"
                >
                  Generate your first report
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Type</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Period</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Income</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Expenses</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">NOI</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Generated</th>
                      <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{r.properties?.name || 'Portfolio'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent capitalize">
                            {r.report_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{r.period_start} to {r.period_end}</td>
                        <td className="px-4 py-3 text-green-400 text-right">
                          {r.total_income != null ? `$${r.total_income.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-red-400 text-right">
                          {r.total_expenses != null ? `$${r.total_expenses.toLocaleString()}` : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${(r.net_operating_income || 0) >= 0 ? 'text-accent' : 'text-red-400'}`}>
                          {r.net_operating_income != null ? `$${r.net_operating_income.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-text-muted text-xs">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {r.pdf_url && (
                              <a
                                href={r.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg hover:bg-bg-elevated text-accent transition-colors"
                                title="Download PDF"
                              >
                                <Download size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteReport(r.id)}
                              disabled={deletingReportId === r.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
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
