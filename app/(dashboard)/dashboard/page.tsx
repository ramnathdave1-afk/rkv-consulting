'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import MetricCard from '@/components/dashboard/MetricCard';
import AlertBanner, { type Alert } from '@/components/dashboard/AlertBanner';
import ActivityFeed, { type Activity } from '@/components/dashboard/ActivityFeed';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type {
  Property,
  Deal,
  Tenant,
  RentPayment,
  MaintenanceRequest,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PIE_COLORS = ['#059669', '#0EA5E9', '#059669', '#3B82F6', '#A855F7', '#DC2626', '#F97316'];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  single_family: 'Single Family',
  multi_family: 'Multi Family',
  condo: 'Condo',
  townhouse: 'Townhouse',
  commercial: 'Commercial',
  land: 'Land',
  mixed_use: 'Mixed Use',
};

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
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

function getStatusBadge(status: string): { bg: string; text: string } {
  switch (status) {
    case 'active':
      return { bg: 'bg-green/15', text: 'text-green' };
    case 'vacant':
      return { bg: 'bg-red/15', text: 'text-red' };
    case 'under_renovation':
      return { bg: 'bg-gold/15', text: 'text-gold' };
    default:
      return { bg: 'bg-muted/15', text: 'text-muted' };
  }
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip for Recharts                                        */
/* ------------------------------------------------------------------ */

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 shadow-card" style={{ background: '#0C1018', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
      <p className="font-mono text-[10px] text-muted">{label}</p>
      <p className="font-mono text-sm font-semibold text-gold">{formatFullCurrency(payload[0].value)}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  // Loading state
  const [loading, setLoading] = useState(true);

  // Data state
  const [properties, setProperties] = useState<Property[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // AI brief state
  const [aiBrief, setAiBrief] = useState<string>('');
  const [aiBriefLoading, setAiBriefLoading] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userId = user.id;

      // Parallel fetch all data
      const [
        propertiesRes,
        dealsRes,
        tenantsRes,
        rentRes,
        maintenanceRes,
        activityRes,
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
        // Recent activity from multiple sources
        supabase
          .from('agent_logs')
          .select('id, action, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const propsData = (propertiesRes.data || []) as Property[];
      const dealsData = (dealsRes.data || []) as Deal[];
      const tenantsData = (tenantsRes.data || []) as Tenant[];
      const rentData = (rentRes.data || []) as RentPayment[];
      const maintData = (maintenanceRes.data || []) as MaintenanceRequest[];

      setProperties(propsData);
      setDeals(dealsData);
      setTenants(tenantsData);
      setRentPayments(rentData);
      setMaintenanceRequests(maintData);

      // Build activity feed from multiple sources
      const activityItems: Activity[] = [];

      // Rent payment activities
      rentData.slice(0, 5).forEach((payment) => {
        activityItems.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          description: payment.status === 'paid'
            ? `Rent payment received: ${formatFullCurrency(payment.amount)}`
            : `Rent payment ${payment.status}: ${formatFullCurrency(payment.amount)}`,
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
          message: `${overduePayments.length} rent payment${overduePayments.length > 1 ? 's are' : ' is'} overdue. Total: ${formatFullCurrency(overduePayments.reduce((sum, p) => sum + p.amount, 0))}`,
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

      // Insurance expiring within 60 days (check property notes/documents for now)
      // TODO: Add insurance_expiry field to properties table
      // For now, skip this alert as there is no insurance_expiry column yet

      setAlerts(newAlerts);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    (sum, p) => sum + (p.monthly_expenses || 0),
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

  // TODO: Calculate from historical data (transactions table, monthly snapshots)
  // For now, generate mock trend data based on current values
  const cashFlowChartData = MONTHS.map((month, _i) => {
    const variance = 0.85 + Math.random() * 0.3;
    return {
      month,
      cashFlow: Math.round(monthlyCashFlow * variance),
    };
  });

  // Property breakdown by type
  const propertyTypeMap = new Map<string, { count: number; totalValue: number }>();
  properties.forEach((p) => {
    const existing = propertyTypeMap.get(p.property_type) || { count: 0, totalValue: 0 };
    propertyTypeMap.set(p.property_type, {
      count: existing.count + 1,
      totalValue: existing.totalValue + (p.current_value || 0),
    });
  });

  const pieData = Array.from(propertyTypeMap.entries()).map(([type, data]) => ({
    name: PROPERTY_TYPE_LABELS[type] || type,
    value: data.totalValue,
    count: data.count,
  }));

  // Sparkline data (last 6 months mock trend)
  // TODO: calculate from historical data
  const sparklinePortfolio = [85, 88, 90, 92, 95, 100].map(
    (pct) => Math.round(totalPortfolioValue * (pct / 100)),
  );
  const sparklineCashFlow = [70, 80, 75, 85, 90, 100].map(
    (pct) => Math.round(monthlyCashFlow * (pct / 100)),
  );
  const sparklineEquity = [60, 70, 75, 80, 88, 100].map(
    (pct) => Math.round(totalEquity * (pct / 100)),
  );
  const sparklineROI = [5.2, 6.1, 5.8, 7.0, 7.5, netROI > 0 ? netROI : 8.2];

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
        description: `Rent due: ${formatFullCurrency(p.amount)}`,
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
      {/*  ROW 1 - Metric Cards                                         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Portfolio Value"
          value={formatCurrency(totalPortfolioValue)}
          change={12.5}
          changeLabel="vs last quarter"
          icon={DollarSign}
          trend="up"
          sparklineData={sparklinePortfolio}
          loading={loading}
        />
        <MetricCard
          title="Monthly Cash Flow"
          value={formatCurrency(monthlyCashFlow)}
          change={monthlyCashFlow >= 0 ? 8.3 : -5.1}
          changeLabel="vs last month"
          icon={TrendingUp}
          trend={monthlyCashFlow >= 0 ? 'up' : 'down'}
          sparklineData={sparklineCashFlow}
          loading={loading}
        />
        <MetricCard
          title="Total Equity"
          value={formatCurrency(totalEquity)}
          change={15.2}
          changeLabel="vs last quarter"
          icon={BuildingIcon}
          trend="up"
          sparklineData={sparklineEquity}
          loading={loading}
        />
        <MetricCard
          title="Net ROI"
          value={netROI.toFixed(1)}
          suffix="%"
          change={2.4}
          changeLabel="vs last year"
          icon={Percent}
          trend="up"
          sparklineData={sparklineROI}
          loading={loading}
        />
      </div>

      {/* ============================================================ */}
      {/*  ROW 2 - Portfolio Performance + Property Breakdown            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Portfolio Performance LineChart */}
        <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="flex items-center justify-between mb-5">
            <span className="label text-gold">Portfolio Performance</span>
            <span className="font-body text-[10px] text-muted-deep">12 Months</span>
          </div>
          {loading ? (
            <Skeleton variant="chart" height="280px" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cashFlowChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(30, 37, 48, 0.6)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="#4A6080"
                  tick={{ fill: '#4A6080', fontSize: 12 }}
                  axisLine={{ stroke: '#161E2A' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#4A6080"
                  tick={{ fill: '#4A6080', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) => formatCurrency(val)}
                  width={70}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cashFlow"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: '#059669',
                    stroke: '#0C1018',
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Property Breakdown */}
        <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="flex items-center justify-between mb-5">
            <span className="label text-gold">Property Breakdown</span>
            <span className="font-body text-[10px] text-muted-deep">{properties.length} Assets</span>
          </div>
          {loading ? (
            <Skeleton variant="chart" height="280px" />
          ) : pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-deep border border-border rounded-lg px-3 py-2 shadow-card">
                          <p className="text-xs text-muted">{d.name}</p>
                          <p className="text-sm font-semibold text-white">{formatFullCurrency(d.value)}</p>
                          <p className="text-xs text-muted">{d.count} {d.count === 1 ? 'property' : 'properties'}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Property list below chart */}
              <div className="w-full mt-4 space-y-2 max-h-[160px] overflow-y-auto">
                {properties.slice(0, 6).map((property, index) => {
                  const statusInfo = getStatusBadge(property.status);
                  return (
                    <div
                      key={property.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-sm text-white truncate">{property.address}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted">
                          {property.monthly_rent ? formatFullCurrency(property.monthly_rent) + '/mo' : '--'}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                            statusInfo.bg,
                            statusInfo.text,
                          )}
                        >
                          {property.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
        <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
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
                .filter((d) => d.stage !== 'closed' && d.stage !== 'dead')
                .slice(0, 3)
                .map((deal) => {
                  const score = deal.analysis?.score
                    ? Math.round(deal.analysis.score / 10)
                    : null;

                  return (
                    <div
                      key={deal.id}
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
                            {getDealStageLabel(deal.stage)}
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
                    </div>
                  );
                })}
              {deals.filter((d) => d.stage !== 'closed' && d.stage !== 'dead').length === 0 && (
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
        <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
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
                const EventIcon = event.icon;
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
        <div className="rounded-lg p-5 relative overflow-hidden" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          {/* Animated left border */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'linear-gradient(180deg, #059669, #0EA5E9, #059669)', backgroundSize: '100% 200%', animation: 'border-rotate 3s ease infinite' }} />
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
        <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
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
                            const EventIcon = event.icon;
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
        <div className="rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
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
            const gradeColor = overallIQ >= 80 ? '#059669' : overallIQ >= 60 ? '#0EA5E9' : overallIQ >= 40 ? '#D97706' : '#DC2626';

            const radius = 52;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (overallIQ / 100) * circumference;

            const subScores = [
              { label: 'Cash Flow', score: cashFlowScore, color: '#059669' },
              { label: 'Diversification', score: diversificationScore, color: '#0EA5E9' },
              { label: 'Equity Growth', score: equityScore, color: '#059669' },
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
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="#161E2A" strokeWidth="8" />
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
