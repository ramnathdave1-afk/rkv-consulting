'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReducedMotion, variantEntranceFromBelow, variantReduced, transitionEntrance, transitionReduced } from '@/lib/motion';
import {
  DollarSign,
  TrendingUp,
  Building2 as BuildingIcon,
  Percent,
  Home,
  Calendar,
  Wrench,
  FileText,
  Sparkles,
  Plus,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';

const PortfolioChart = dynamic(() => import('@/components/dashboard/PortfolioChart'), {
  ssr: false,
  loading: () => <div className="h-[280px] rounded-lg bg-border/20 animate-pulse" />,
});
import MetricCard from '@/components/dashboard/MetricCard';
import AlertBanner, { type Alert } from '@/components/dashboard/AlertBanner';
import ActivityFeed, { type Activity } from '@/components/dashboard/ActivityFeed';
import LiveMarketPulse from '@/components/market/LiveMarketPulse';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type {
  Property,
  Deal,
  Tenant,
  RentPayment,
  MaintenanceRequest,
  Transaction,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PIE_COLORS = ['#c9a84c', '#c9a84c', '#c9a84c', '#3B82F6', '#A855F7', '#DC2626', '#F97316'];


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatFullCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getDealScoreColor(score: number): string {
  if (score >= 8) return 'bg-green/15 text-green border-green/20';
  if (score >= 5) return 'bg-gold/15 text-gold border-gold/20';
  return 'bg-red/15 text-red border-red/20';
}

function getDealStageLabel(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [tickCardIndex, setTickCardIndex] = useState<number | null>(null);

  const entranceVariant = reduced ? variantReduced : variantEntranceFromBelow;
  const transition = reduced ? transitionReduced : { ...transitionEntrance, duration: 0.4 };
  const staggerDelay = reduced ? 0 : 0.06;

  // Loading and error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Data state
  const [properties, setProperties] = useState<Property[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioSnapshots, setPortfolioSnapshots] = useState<{ portfolio_value: number; equity: number; monthly_cash_flow: number; net_roi: number | null }[]>([]);

  // AI brief state
  const [aiBrief, setAiBrief] = useState<string>('');
  const [aiBriefLoading, setAiBriefLoading] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userId = user.id;

      // Parallel fetch all data (transactions for last 24 months for charts)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const [
        propertiesRes,
        dealsRes,
        tenantsRes,
        rentRes,
        maintenanceRes,
        activityRes,
        transactionsRes,
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('deals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('tenants')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('rent_payments')
          .select('*')
          .eq('user_id', userId)
          .order('due_date', { ascending: false })
          .limit(50),
        supabase
          .from('maintenance_requests')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('agent_logs')
          .select('id, action, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .gte('date', twoYearsAgo.toISOString().split('T')[0])
          .order('date', { ascending: true }),
      ]);

      const propsData = (propertiesRes.data || []) as Property[];
      const dealsData = (dealsRes.data || []) as Deal[];
      const tenantsData = (tenantsRes.data || []) as Tenant[];
      const rentData = (rentRes.data || []) as RentPayment[];
      const maintData = (maintenanceRes.data || []) as MaintenanceRequest[];
      const txData = (transactionsRes.data || []) as Transaction[];

      setProperties(propsData);
      setDeals(dealsData);
      setTenants(tenantsData);
      setRentPayments(rentData);
      setMaintenanceRequests(maintData);
      setTransactions(txData);

      // Build activity feed from multiple sources
      const activityItems: Activity[] = [];

      // Rent payment activities
      rentData.slice(0, 5).forEach((payment) => {
        activityItems.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          description: payment.status === 'paid'
            ? `Rent payment received: ${formatFullCurrency(payment.amount_due)}`
            : `Rent payment ${payment.status}: ${formatFullCurrency(payment.amount_due)}`,
          timestamp: payment.paid_date || payment.due_date,
        });
      });

      // Maintenance activities
      maintData.slice(0, 3).forEach((req) => {
        activityItems.push({
          id: `maint-${req.id}`,
          type: 'maintenance',
          description: `${req.title} - ${req.status.replace('_', ' ')}`,
          property: propsData.find((p) => p.id === req.property_id)?.address,
          timestamp: req.created_at,
        });
      });

      // Agent log activities
      (activityRes.data || []).slice(0, 3).forEach((log: { id: string; action: string; created_at: string }) => {
        activityItems.push({
          id: `agent-${log.id}`,
          type: 'agent',
          description: log.action,
          timestamp: log.created_at,
        });
      });

      // Sort by timestamp descending
      activityItems.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

      setActivities(activityItems.slice(0, 10));

      // Build alerts
      const newAlerts: Alert[] = [];
      const now = new Date();

      // Overdue rent payments
      const overduePayments = rentData.filter(
        (p) => p.status === 'pending' && new Date(p.due_date) < now,
      );
      if (overduePayments.length > 0) {
        newAlerts.push({
          id: 'overdue-rent',
          type: 'danger',
          title: 'Overdue Rent Payments',
          message: `${overduePayments.length} rent payment${overduePayments.length > 1 ? 's are' : ' is'} overdue. Total: ${formatFullCurrency(overduePayments.reduce((sum, p) => sum + (p.amount_due || 0), 0))}`,
          actionLabel: 'View Payments',
          action: () => router.push('/tenants'),
          dismissible: true,
        });
      }

      // Leases expiring within 30 days
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringLeases = tenantsData.filter(
        (t) => t.lease_end && new Date(t.lease_end) <= thirtyDaysFromNow && new Date(t.lease_end) >= now,
      );
      if (expiringLeases.length > 0) {
        newAlerts.push({
          id: 'expiring-leases',
          type: 'warning',
          title: 'Leases Expiring Soon',
          message: `${expiringLeases.length} lease${expiringLeases.length > 1 ? 's expire' : ' expires'} within the next 30 days.`,
          actionLabel: 'View Tenants',
          action: () => router.push('/tenants'),
          dismissible: true,
        });
      }

      // Unresolved maintenance over 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const unresolvedMaint = maintData.filter(
        (m) =>
          (m.status === 'open' || m.status === 'in_progress') &&
          new Date(m.created_at) < sevenDaysAgo,
      );
      if (unresolvedMaint.length > 0) {
        newAlerts.push({
          id: 'unresolved-maintenance',
          type: 'warning',
          title: 'Unresolved Maintenance',
          message: `${unresolvedMaint.length} maintenance request${unresolvedMaint.length > 1 ? 's have' : ' has'} been open for over 7 days.`,
          actionLabel: 'View Requests',
          action: () => router.push('/maintenance'),
          dismissible: true,
        });
      }

      // Insurance expiring within 60 days
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const expiringInsurance = properties.filter(
        (p) => p.insurance_expiry && new Date(p.insurance_expiry) <= sixtyDaysFromNow && new Date(p.insurance_expiry) >= now,
      );
      if (expiringInsurance.length > 0) {
        newAlerts.push({
          id: 'expiring-insurance',
          type: 'warning',
          title: 'Insurance Expiring Soon',
          message: `${expiringInsurance.length} property insurance policy${expiringInsurance.length > 1 ? ' policies expire' : ' expires'} within the next 60 days.`,
          actionLabel: 'View Properties',
          action: () => router.push('/properties'),
          dismissible: true,
        });
      }

      setAlerts(newAlerts);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to load dashboard'));
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Live tick: every 30–45s one metric card flashes (Bloomberg-style) */
  useEffect(() => {
    if (reduced || loading) return;
    const delay = 30000 + Math.random() * 15000;
    const t = setInterval(() => {
      setTickCardIndex(Math.floor(Math.random() * 4));
      setTimeout(() => setTickCardIndex(null), 300);
    }, delay);
    return () => clearInterval(t);
  }, [reduced, loading]);

  /* Portfolio snapshots: record today and fetch last 6 for sparklines */
  useEffect(() => {
    if (loading || properties.length === 0) return;
    const pv = properties.reduce((s, p) => s + (p.current_value || 0), 0);
    const tm = properties.reduce((s, p) => s + (p.monthly_rent || 0), 0);
    const te = properties.reduce((s, p) => s + (p.mortgage_payment || 0) + (p.insurance_annual || 0) / 12 + (p.tax_annual || 0) / 12 + (p.hoa_monthly || 0), 0);
    const cf = tm - te;
    const eq = properties.reduce((s, p) => s + ((p.current_value || 0) - (p.mortgage_balance || 0)), 0);
    const inv = properties.reduce((s, p) => s + (p.purchase_price || 0), 0);
    const roi = inv > 0 ? ((eq - inv + cf * 12) / inv) * 100 : 0;
    fetch('/api/portfolio/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio_value: pv, equity: eq, monthly_cash_flow: cf, net_roi: roi }),
    })
      .then(() => fetch('/api/portfolio/snapshot'))
      .then((r) => r.json())
      .then((data) => setPortfolioSnapshots(Array.isArray(data) ? data : []))
      .catch(() => setPortfolioSnapshots([]));
  }, [loading, properties]);

  /* ---------------------------------------------------------------- */
  /*  Calculated metrics                                               */
  /* ---------------------------------------------------------------- */

  const totalPortfolioValue = properties.reduce(
    (sum, p) => sum + (p.current_value || 0),
    0,
  );

  const totalMonthlyRent = properties.reduce(
    (sum, p) => sum + (p.monthly_rent || 0),
    0,
  );

  const totalMonthlyExpenses = properties.reduce(
    (sum, p) => sum + (p.mortgage_payment || 0) + (p.insurance_annual || 0) / 12 + (p.tax_annual || 0) / 12 + (p.hoa_monthly || 0),
    0,
  );

  const monthlyCashFlow = totalMonthlyRent - totalMonthlyExpenses;

  const totalEquity = properties.reduce(
    (sum, p) => sum + ((p.current_value || 0) - (p.mortgage_balance || 0)),
    0,
  );

  const totalInvested = properties.reduce(
    (sum, p) => sum + (p.purchase_price || 0),
    0,
  );

  const netROI = totalInvested > 0
    ? ((totalEquity - totalInvested + monthlyCashFlow * 12) / totalInvested) * 100
    : 0;

  /* ---------------------------------------------------------------- */
  /*  Chart data                                                       */
  /* ---------------------------------------------------------------- */

  const chartNow = new Date();
  // Cash flow from transactions (last 12 months); fallback to derived if no tx data
  const cashFlowChartData = (() => {
    const monthsWithNet = MONTHS.map((month, i) => {
      const monthStart = new Date(chartNow.getFullYear(), i, 1);
      const monthEnd = new Date(chartNow.getFullYear(), i + 1, 0);
      const monthTx = transactions.filter((tx) => {
        const d = new Date(tx.date);
        return d >= monthStart && d <= monthEnd;
      });
      const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { month, cashFlow: Math.round(income - expense) };
    });
    const hasAnyTx = transactions.some((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === chartNow.getFullYear();
    });
    if (hasAnyTx) return monthsWithNet;
    return MONTHS.map((month, i) => {
      const variance = 0.85 + ((i + 1) / 12) * 0.2;
      return { month, cashFlow: Math.round(monthlyCashFlow * variance) };
    });
  })();

  // Sparkline: cash flow from last 6 months of transactions; others still derived (no historical snapshots)
  const sparklineCashFlow = (() => {
    const sixMonths: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(chartNow.getFullYear(), chartNow.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthTx = transactions.filter((tx) => {
        const t = new Date(tx.date);
        return t >= start && t <= end;
      });
      const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      sixMonths.push(Math.round(income - expense));
    }
    const hasAny = sixMonths.some((v) => v !== 0);
    if (hasAny) return sixMonths;
    return [70, 80, 75, 85, 90, 100].map((pct) => Math.round(monthlyCashFlow * (pct / 100)));
  })();

  const sparklinePortfolio =
    portfolioSnapshots.length >= 2
      ? portfolioSnapshots.map((s) => Math.round(Number(s.portfolio_value)))
      : [85, 88, 90, 92, 95, 100].map((pct) => Math.round(totalPortfolioValue * (pct / 100)));
  const sparklineEquity =
    portfolioSnapshots.length >= 2
      ? portfolioSnapshots.map((s) => Math.round(Number(s.equity)))
      : [60, 70, 75, 80, 88, 100].map((pct) => Math.round(totalEquity * (pct / 100)));
  const sparklineROI =
    portfolioSnapshots.length >= 2
      ? portfolioSnapshots.map((s) => (s.net_roi != null ? Number(s.net_roi) : 0))
      : [5.2, 6.1, 5.8, 7.0, 7.5, netROI > 0 ? netROI : 8.2];

  /* ---------------------------------------------------------------- */
  /*  Upcoming events                                                  */
  /* ---------------------------------------------------------------- */

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  interface UpcomingEvent {
    id: string;
    date: Date;
    description: string;
    type: 'lease' | 'rent' | 'maintenance';
    icon: React.ElementType;
  }

  const upcomingEvents: UpcomingEvent[] = [];

  // Lease expirations
  tenants
    .filter((t) => t.lease_end && new Date(t.lease_end) >= now && new Date(t.lease_end) <= thirtyDaysOut)
    .forEach((t) => {
      upcomingEvents.push({
        id: `lease-${t.id}`,
        date: new Date(t.lease_end!),
        description: `Lease expires: ${t.first_name} ${t.last_name}`,
        type: 'lease',
        icon: FileText,
      });
    });

  // Rent due dates
  rentPayments
    .filter((p) => p.status === 'pending' && new Date(p.due_date) >= now && new Date(p.due_date) <= thirtyDaysOut)
    .forEach((p) => {
      upcomingEvents.push({
        id: `rent-${p.id}`,
        date: new Date(p.due_date),
        description: `Rent due: ${formatFullCurrency(p.amount_due)}`,
        type: 'rent',
        icon: DollarSign,
      });
    });

  // Scheduled maintenance
  maintenanceRequests
    .filter((m) => m.scheduled_date && m.status !== 'completed' && m.status !== 'canceled' && new Date(m.scheduled_date) >= now && new Date(m.scheduled_date) <= thirtyDaysOut)
    .forEach((m) => {
      upcomingEvents.push({
        id: `maint-event-${m.id}`,
        date: new Date(m.scheduled_date!),
        description: m.title,
        type: 'maintenance',
        icon: Wrench,
      });
    });

  // Sort by date ascending
  upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  /* ---------------------------------------------------------------- */
  /*  AI Market Brief handler                                          */
  /* ---------------------------------------------------------------- */

  async function handleGenerateBrief() {
    setAiBriefLoading(true);
    setAiBrief('');

    try {
      const res = await fetch('/api/ai/market-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: properties.map((p) => ({
            address: p.address,
            property_type: p.property_type,
            current_value: p.current_value,
            monthly_rent: p.monthly_rent,
            mortgage_balance: p.mortgage_balance,
            purchase_price: p.purchase_price,
          })),
          metrics: {
            totalPortfolioValue,
            monthlyCashFlow,
            totalEquity,
            netROI: netROI.toFixed(1),
            propertyCount: properties.length,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to generate brief');

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulated = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setAiBrief(accumulated);
        }
      } else {
        const data = await res.json();
        setAiBrief(data.brief || data.content || 'Unable to generate brief.');
      }
    } catch {
      // Fallback to local generation if API fails
      const fallbackBrief =
        `Based on your portfolio of ${properties.length} properties valued at ${formatFullCurrency(totalPortfolioValue)}, ` +
        `you're generating ${formatFullCurrency(monthlyCashFlow)}/mo in cash flow with ${formatFullCurrency(totalEquity)} in total equity. ` +
        `Your net ROI stands at ${netROI.toFixed(1)}%. ` +
        'Consider reviewing properties with the lowest cap rates for potential rent increases or refinancing opportunities.';
      setAiBrief(fallbackBrief);
    } finally {
      setAiBriefLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Error state — retry                                              */
  /* ---------------------------------------------------------------- */

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <EmptyState
          icon={<AlertCircle className="size-10 text-red" />}
          title="Something went wrong"
          description={error.message}
          action={{
            label: 'Try again',
            onClick: () => {
              setError(null);
              fetchData();
            },
          }}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Empty state                                                      */
  /* ---------------------------------------------------------------- */

  if (!loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <EmptyState
          icon={<Home />}
          title="Welcome to RKV Consulting"
          description="Get started by adding your first property to unlock portfolio analytics, deal analysis, and AI-powered insights."
          action={{
            label: 'Add Your First Property',
            onClick: () => router.push('/properties?action=new'),
            icon: <Plus />,
          }}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  Alert Banners                                                */}
      {/* ============================================================ */}
      {alerts.length > 0 && (
        <AlertBanner alerts={alerts} />
      )}

      {/* ============================================================ */}
      {/*  Live market pulse (day-to-day rates & indicators)            */}
      {/* ============================================================ */}
      <LiveMarketPulse compact />

      {/* ============================================================ */}
      {/*  ROW 1 - Metric Cards (stagger 60ms, 400ms from below)         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Portfolio Value', value: formatCurrency(totalPortfolioValue), change: 0, changeLabel: 'No prior period', icon: DollarSign, trend: 'up' as const, sparklineData: sparklinePortfolio },
          { title: 'Monthly Cash Flow', value: formatCurrency(monthlyCashFlow), change: 0, changeLabel: 'No prior period', icon: TrendingUp, trend: monthlyCashFlow >= 0 ? ('up' as const) : ('down' as const), sparklineData: sparklineCashFlow },
          { title: 'Total Equity', value: formatCurrency(totalEquity), change: 0, changeLabel: 'No prior period', icon: BuildingIcon, trend: 'up' as const, sparklineData: sparklineEquity },
          { title: 'Net ROI', value: netROI.toFixed(1), suffix: '%', change: 0, changeLabel: 'No prior period', icon: Percent, trend: 'up' as const, sparklineData: sparklineROI },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={entranceVariant.hidden}
            animate={loading ? entranceVariant.hidden : entranceVariant.visible}
            transition={{ ...transition, delay: loading ? 0 : i * staggerDelay }}
          >
            <MetricCard
              title={card.title}
              value={card.value}
              suffix={'suffix' in card ? card.suffix : ''}
              change={card.change}
              changeLabel={card.changeLabel}
              icon={card.icon}
              trend={card.trend}
              sparklineData={card.sparklineData}
              loading={loading}
              animateProgress={!reduced}
              flash={tickCardIndex === i}
            />
          </motion.div>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  ROW 2 - Portfolio Performance + Property Breakdown            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Portfolio Performance LineChart */}
        <div className="rounded-lg p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex items-center justify-between mb-5">
            <span className="label text-gold">Portfolio Performance</span>
            <span className="font-body text-[10px] text-muted-deep">12 Months</span>
          </div>
          {loading ? (
            <Skeleton variant="chart" height="280px" />
          ) : (
            <PortfolioChart data={cashFlowChartData} />
          )}
        </div>

        {/* Property Breakdown — Horizontal Bars */}
        <div className="rounded-lg p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex items-center justify-between mb-5">
            <span className="label text-gold">Property Breakdown</span>
            <span className="font-body text-[10px] text-muted-deep">{properties.length} Assets</span>
          </div>
          {loading ? (
            <Skeleton variant="chart" height="280px" />
          ) : properties.length > 0 ? (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {(() => {
                const totalValue = properties.reduce((s, p) => s + (p.current_value || 0), 0);
                return properties.map((property, index) => {
                  const value = property.current_value || 0;
                  const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                  return (
                    <motion.div
                      key={property.id}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-body text-[13px] text-white truncate max-w-[55%]">
                          {property.address}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono text-[13px] font-semibold text-white">
                            {formatFullCurrency(value)}
                          </span>
                          <span className="font-mono text-[11px] text-muted">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={reduced ? false : { width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            background: `linear-gradient(90deg, #c9a84c, ${PIE_COLORS[index % PIE_COLORS.length]})`,
                          }}
                        />
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[280px] text-center">
              <p className="text-sm text-muted">No property data available</p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 3 - Active Deals + Upcoming + AI Market Brief             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Deals */}
        <div className="rounded-lg p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="label text-gold">Active Pipeline</span>
            <Link
              href="/deal-analyzer"
              className="font-body text-[10px] text-gold hover:text-gold-light transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="text" height="60px" className="rounded-lg" />
              ))}
            </div>
          ) : deals.length > 0 ? (
            <div className="space-y-3">
              {deals
                .filter((d) => d.status !== 'closed' && d.status !== 'dead')
                .slice(0, 3)
                .map((deal, i) => {
                  const score = deal.analysis?.score
                    ? Math.round(deal.analysis.score / 10)
                    : null;

                  return (
                    <motion.div
                      key={deal.id}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/deal-analyzer?deal=${deal.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {deal.address}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted">
                            {formatFullCurrency(deal.asking_price)}
                          </span>
                          <span className="text-[10px] font-medium text-muted bg-border/50 rounded-full px-2 py-0.5">
                            {getDealStageLabel(deal.status)}
                          </span>
                        </div>
                      </div>
                      {score !== null && (
                        <span
                          className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold border flex-shrink-0',
                            getDealScoreColor(score),
                          )}
                        >
                          {score}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              {deals.filter((d) => d.status !== 'closed' && d.status !== 'dead').length === 0 && (
                <div className="text-center py-8">
                  <p className="font-body text-[11px] text-muted-deep">No active deals</p>
                  <Link
                    href="/deal-analyzer?action=new"
                    className="font-body text-[11px] text-gold hover:text-gold-light mt-2 inline-block"
                  >
                    Analyze New Deal
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-body text-[11px] text-muted-deep">No deals recorded</p>
              <Link
                href="/deal-analyzer?action=new"
                className="font-body text-[11px] text-gold hover:text-gold-light mt-2 inline-block"
              >
                Analyze First Deal
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-lg p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="label text-gold">Upcoming · 30 Days</span>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="text" height="50px" className="rounded-lg" />
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-1 max-h-[320px] overflow-y-auto">
              {upcomingEvents.slice(0, 8).map((event) => {
                const EventIcon = event.icon as React.ComponentType<{ className?: string }>;
                const typeColors: Record<string, { bg: string; text: string }> = {
                  lease: { bg: 'bg-gold/10', text: 'text-gold' },
                  rent: { bg: 'bg-green/10', text: 'text-green' },
                  maintenance: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
                };
                const colors = typeColors[event.type] || typeColors.lease;

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0', colors.bg)}>
                      <EventIcon className={cn('h-3.5 w-3.5', colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-snug truncate">
                        {event.description}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {event.date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-8 w-8 text-muted/40 mb-3" />
              <p className="text-sm text-muted">No upcoming events</p>
              <p className="text-xs text-muted/60 mt-1">Events will appear as you add tenants and schedule maintenance</p>
            </div>
          )}
        </div>

        {/* AI Intelligence Brief */}
        <div className="rounded-lg p-5 relative overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          {/* Animated left border */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'linear-gradient(180deg, #c9a84c, #c9a84c, #c9a84c)', backgroundSize: '100% 200%', animation: 'border-rotate 3s ease infinite' }} />
          <div className="flex items-center justify-between mb-4 pl-2">
            <span className="label text-gold">AI Intelligence Brief</span>
            <Sparkles className="h-3 w-3 text-gold opacity-50" />
          </div>
          {aiBrief ? (
            <div className="space-y-4 pl-2">
              <p className="text-[13px] text-white/90 leading-relaxed font-body">{aiBrief}</p>
              {!aiBriefLoading && (
                <button
                  type="button"
                  onClick={handleGenerateBrief}
                  className="font-body text-[10px] text-gold hover:text-gold-light transition-colors border border-gold/20 rounded px-2 py-1 hover:bg-gold/5"
                >
                  Regenerate Brief
                </button>
              )}
              <p className="font-body text-[9px] text-muted-deep">Powered by Claude AI</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center pl-2">
              <div className="w-12 h-12 rounded-lg bg-gold/8 flex items-center justify-center border border-gold/20 mb-4">
                <Sparkles className="h-5 w-5 text-gold" />
              </div>
              <p className="text-[13px] text-muted mb-4 font-body">
                AI-powered insights about your portfolio
              </p>
              <button
                type="button"
                onClick={handleGenerateBrief}
                disabled={aiBriefLoading}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded font-mono text-[11px] font-semibold',
                  'bg-gold/10 text-gold border border-gold/30',
                  'hover:bg-gold/20 hover:shadow-glow',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {aiBriefLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Brief
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 4 - Mini Calendar + Investment IQ                          */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mini Calendar Widget — Next 7 Days */}
        <div className="rounded-lg p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="label text-gold">Next 7 Days</span>
            <Link
              href="/calendar"
              className="font-body text-[10px] text-gold hover:text-gold-light transition-colors flex items-center gap-1"
            >
              Full Calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="text" height="48px" className="rounded-lg" />
              ))}
            </div>
          ) : (() => {
            // Build next 7 days of events
            const next7Days: { date: Date; events: typeof upcomingEvents }[] = [];
            for (let d = 0; d < 7; d++) {
              const day = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
              const dayEvents = upcomingEvents.filter(
                (e) =>
                  e.date.getFullYear() === day.getFullYear() &&
                  e.date.getMonth() === day.getMonth() &&
                  e.date.getDate() === day.getDate(),
              );

              // Also add recurring rent dues on the 1st
              if (day.getDate() === 1 && d > 0) {
                tenants.filter((t) => t.status === 'active').forEach((t) => {
                  dayEvents.push({
                    id: `mini-rent-${t.id}`,
                    date: day,
                    description: `${t.first_name} ${t.last_name} — Rent Due $${t.monthly_rent.toLocaleString()}`,
                    type: 'rent',
                    icon: DollarSign,
                  });
                });
              }

              next7Days.push({ date: day, events: dayEvents });
            }

            const hasAnyEvents = next7Days.some((d) => d.events.length > 0);

            if (!hasAnyEvents) {
              return (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarDays className="h-8 w-8 text-muted/30 mb-3" />
                  <p className="text-sm text-muted">Clear schedule ahead</p>
                  <p className="text-xs text-muted/60 mt-1">No events in the next 7 days</p>
                </div>
              );
            }

            return (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {next7Days.map(({ date: dayDate, events: dayEvents }) => {
                  const isToday = dayDate.toDateString() === now.toDateString();
                  const dayLabel = isToday
                    ? 'Today'
                    : dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                  return (
                    <div key={dayDate.toISOString()}>
                      <div className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded',
                        isToday ? 'bg-gold/5' : '',
                      )}>
                        <span className={cn(
                          'font-body text-[11px] font-medium',
                          isToday ? 'text-gold' : 'text-muted',
                        )}>
                          {dayLabel}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-muted bg-border/50 rounded-full px-1.5 py-0.5 font-mono">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="ml-2 pl-3 border-l border-border/50 space-y-1 mb-2">
                          {dayEvents.slice(0, 3).map((event) => {
                            const EventIcon = event.icon as React.ComponentType<{ className?: string }>;
                            const colorMap: Record<string, string> = {
                              rent: 'text-green',
                              lease: 'text-gold',
                              maintenance: 'text-gold-light',
                            };
                            return (
                              <div
                                key={event.id}
                                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 transition-colors"
                              >
                                <EventIcon className={cn('h-3 w-3 flex-shrink-0', colorMap[event.type] || 'text-muted')} />
                                <span className="text-xs text-white truncate">{event.description}</span>
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-muted ml-2">+{dayEvents.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Investment IQ Score Widget */}
        <div className="rounded-lg p-5" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="label text-gold">Investment IQ</span>
            <Sparkles className="h-3 w-3 text-gold opacity-40" />
          </div>
          {loading ? (
            <Skeleton variant="chart" height="240px" />
          ) : (() => {
            // Calculate IQ sub-scores
            const cashFlowMargin = totalMonthlyRent > 0
              ? (monthlyCashFlow / totalMonthlyRent) * 100
              : 0;
            const cashFlowScore = cashFlowMargin > 15 ? 92 : cashFlowMargin > 10 ? 78 : cashFlowMargin > 5 ? 62 : cashFlowMargin > 0 ? 40 : 20;

            const uniqueTypes = new Set(properties.map((p) => p.property_type));
            const diversificationScore = uniqueTypes.size >= 3 ? 88 : uniqueTypes.size >= 2 ? 60 : properties.length > 0 ? 30 : 0;

            const avgAppreciation = properties.length > 0
              ? properties.reduce((sum, p) => {
                  const purchase = p.purchase_price || 0;
                  const current = p.current_value || 0;
                  return sum + (purchase > 0 ? ((current - purchase) / purchase) * 100 : 0);
                }, 0) / properties.length
              : 0;
            const equityScore = avgAppreciation > 20 ? 90 : avgAppreciation > 10 ? 75 : avgAppreciation > 5 ? 60 : avgAppreciation > 0 ? 45 : 25;

            const avgVacancy = properties.length > 0
              ? properties.reduce((sum, p) => sum + (p.vacancy_rate || 5), 0) / properties.length
              : 10;
            const activeLeases = tenants.filter((t) => t.status === 'active' && t.lease_end && new Date(t.lease_end) > now).length;
            const riskScore = avgVacancy < 5 && activeLeases >= properties.length ? 85 : avgVacancy < 8 ? 65 : 40;

            const taxScore = properties.length > 0 ? 65 : 0; // Base — improves with categorized transactions

            const marketScore = properties.length > 0 ? 70 : 0; // Base score

            const overallIQ = properties.length > 0
              ? Math.round((cashFlowScore * 0.25 + diversificationScore * 0.15 + equityScore * 0.2 + riskScore * 0.2 + taxScore * 0.1 + marketScore * 0.1))
              : 0;

            const grade = overallIQ >= 80 ? 'A' : overallIQ >= 60 ? 'B' : overallIQ >= 40 ? 'C' : 'D';
            const gradeColor = overallIQ >= 80 ? '#c9a84c' : overallIQ >= 60 ? '#c9a84c' : overallIQ >= 40 ? '#D97706' : '#DC2626';

            const radius = 52;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (overallIQ / 100) * circumference;

            const subScores = [
              { label: 'Cash Flow', score: cashFlowScore, color: '#c9a84c' },
              { label: 'Diversification', score: diversificationScore, color: '#c9a84c' },
              { label: 'Equity Growth', score: equityScore, color: '#c9a84c' },
              { label: 'Risk Mgmt', score: riskScore, color: '#3B82F6' },
              { label: 'Tax Efficiency', score: taxScore, color: '#D97706' },
              { label: 'Market Strength', score: marketScore, color: '#8B5CF6' },
            ];

            if (properties.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted">Add properties to calculate your Investment IQ</p>
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center">
                {/* Circular gauge */}
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e1e1e" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r={radius} fill="none"
                      stroke={gradeColor} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-2xl font-bold text-white">{overallIQ}</span>
                    <span className="font-display text-sm font-bold" style={{ color: gradeColor }}>{grade}</span>
                  </div>
                </div>

                {/* Sub-scores grid */}
                <div className="grid grid-cols-3 gap-3 mt-5 w-full">
                  {subScores.map((sub) => (
                    <div key={sub.label} className="text-center">
                      <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${sub.score}%`, backgroundColor: sub.color }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-white">{sub.score}</span>
                      <p className="font-body text-[9px] text-muted leading-tight">{sub.label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/settings?tab=preferences"
                  className="mt-4 flex items-center gap-1 font-body text-[10px] text-gold hover:text-gold-light transition-colors"
                >
                  Improve Score <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  ROW 5 - Recent Activity                                      */}
      {/* ============================================================ */}
      <ActivityFeed activities={activities} />
    </div>
  );
}
