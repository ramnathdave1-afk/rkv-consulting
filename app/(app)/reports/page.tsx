'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { KPICard } from '@/components/dashboard/KPICard';
import { RevenueChart } from '@/components/reports/RevenueChart';
import { ExpenseBreakdown } from '@/components/reports/ExpenseBreakdown';
import { PropertyRevenue } from '@/components/reports/PropertyRevenue';
import {
  DollarSign,
  TrendingDown,
  BarChart3,
  Percent,
  Home,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { FinancialKPIs } from '@/lib/types';

type Tab = 'overview' | 'rent_roll' | 'expirations';

interface FinancialData {
  kpis: FinancialKPIs;
  monthly_trend: { month: string; income: number; expenses: number }[];
  expense_breakdown: { category: string; amount: number }[];
  revenue_by_property: { property_name: string; amount: number }[];
  expiring_leases: ExpiringLease[];
  rent_roll: RentRollEntry[];
}

interface ExpiringLease {
  id: string;
  lease_end: string;
  monthly_rent: number;
  status: string;
  units: { unit_number: string; properties: { name: string } | null } | null;
  tenants: { first_name: string; last_name: string } | null;
}

interface RentRollEntry {
  monthly_rent: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [reports, setReports] = useState<{ id: string; report_type: string; period_start: string; period_end: string; pdf_url: string | null; created_at: string; properties: { name: string } | null }[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const [financialsRes, reportsRes] = await Promise.all([
        fetch('/api/reports/financials').then((r) => r.json()),
        supabase.from('owner_reports').select('id, report_type, period_start, period_end, pdf_url, created_at, properties(name)').eq('org_id', profile.org_id).order('created_at', { ascending: false }).limit(10),
      ]);

      setData(financialsRes);
      setReports((reportsRes.data || []) as typeof reports);
      setLoading(false);
    }
    fetchAll();
  }, [supabase]);

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
    { title: 'Revenue (MTD)', numericValue: data.kpis.total_revenue_mtd, value: `$${data.kpis.total_revenue_mtd.toLocaleString()}`, icon: DollarSign, color: '#22C55E', sparklineData: [] as number[] },
    { title: 'Expenses (MTD)', numericValue: data.kpis.total_expenses_mtd, value: `$${data.kpis.total_expenses_mtd.toLocaleString()}`, icon: TrendingDown, color: '#EF4444', sparklineData: [] as number[] },
    { title: 'NOI (MTD)', numericValue: data.kpis.noi_mtd, value: `$${data.kpis.noi_mtd.toLocaleString()}`, icon: BarChart3, color: '#00D4AA', sparklineData: [] as number[] },
    { title: 'Occupancy', numericValue: data.kpis.occupancy_rate, value: `${data.kpis.occupancy_rate}%`, icon: Percent, color: '#3B82F6', sparklineData: [] as number[] },
    { title: 'Avg Rent / Unit', numericValue: data.kpis.avg_rent_per_unit, value: `$${data.kpis.avg_rent_per_unit.toLocaleString()}`, icon: Home, color: '#8A00FF', sparklineData: [] as number[] },
    { title: 'Delinquency', numericValue: data.kpis.delinquency_rate, value: `${data.kpis.delinquency_rate}%`, icon: AlertTriangle, color: '#F59E0B', sparklineData: [] as number[] },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'rent_roll', label: 'Rent Roll' },
    { key: 'expirations', label: 'Expirations' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Financial Reports</h1>
          <p className="text-sm text-text-secondary">Portfolio financial overview</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <FileText size={16} />
          Generate PDF Report
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} {...kpi} index={i} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
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

          {/* Recent PDF Reports */}
          {reports.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Generated Reports</h3>
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm text-text-primary">{r.properties?.name || 'Portfolio'} — {r.report_type}</p>
                      <p className="text-[10px] text-text-muted">{r.period_start} to {r.period_end}</p>
                    </div>
                    {r.pdf_url && (
                      <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Download PDF</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'expirations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="glass-card overflow-hidden">
            {data.expiring_leases.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">No leases expiring in the next 90 days.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Tenant</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property / Unit</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rent</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Expires</th>
                    <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expiring_leases.map((l) => {
                    const daysLeft = Math.ceil((new Date(l.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const urgency = daysLeft <= 14 ? 'text-red-500' : daysLeft <= 30 ? 'text-yellow-500' : 'text-text-secondary';
                    return (
                      <tr key={l.id} className="border-b border-border/50 hover:bg-bg-elevated/50">
                        <td className="px-4 py-3 text-text-primary">{l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">{l.units?.properties?.name || '—'} / {l.units?.unit_number || '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">${Number(l.monthly_rent).toLocaleString()}/mo</td>
                        <td className="px-4 py-3 text-text-secondary">{l.lease_end}</td>
                        <td className={`px-4 py-3 font-medium ${urgency}`}>{daysLeft}d</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      )}

      {tab === 'rent_roll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="glass-card p-6 text-center text-text-muted text-sm">
            Rent roll details will populate once lease and financial transaction data is available.
          </div>
        </motion.div>
      )}
    </div>
  );
}
