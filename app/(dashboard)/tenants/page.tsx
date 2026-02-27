'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Eye,
  AlertTriangle,
  Building2,
  Clock,
  TrendingUp,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Tenant, Property, RentPayment } from '@/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FilterKey = 'all' | 'current' | 'late' | 'expiring' | 'vacant';

interface TenantWithProperty extends Tenant {
  property?: Property | null;
  currentPayment?: RentPayment | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getDaysRemaining(leaseEnd: string | null): number | null {
  if (!leaseEnd) return null;
  const end = new Date(leaseEnd);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getPaymentStatus(payment: RentPayment | null | undefined): {
  label: string;
  variant: 'success' | 'danger' | 'warning' | 'default';
  daysLate?: number;
} {
  if (!payment) return { label: 'No Data', variant: 'default' };

  if (payment.status === 'paid') {
    return { label: 'Paid', variant: 'success' };
  }

  if (payment.status === 'late') {
    const now = new Date();
    const due = new Date(payment.due_date);
    const daysLate = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return { label: `Late ${daysLate}d`, variant: 'danger', daysLate };
  }

  if (payment.status === 'partial') {
    return { label: 'Partial', variant: 'warning' };
  }

  // pending - check if due date is approaching
  const now = new Date();
  const due = new Date(payment.due_date);
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) {
    return { label: `Late ${Math.abs(daysUntilDue)}d`, variant: 'danger', daysLate: Math.abs(daysUntilDue) };
  }
  if (daysUntilDue <= 5) {
    return { label: 'Due Soon', variant: 'warning' };
  }
  return { label: 'Pending', variant: 'warning' };
}

function getLeaseColor(daysRemaining: number | null): 'success' | 'warning' | 'danger' | 'default' {
  if (daysRemaining === null) return 'default';
  if (daysRemaining > 90) return 'success';
  if (daysRemaining >= 30) return 'warning';
  return 'danger';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Filter pills                                                       */
/* ------------------------------------------------------------------ */

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'current', label: 'Current' },
  { key: 'late', label: 'Late on Rent' },
  { key: 'expiring', label: 'Expiring Soon' },
  { key: 'vacant', label: 'Vacant Units' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TenantsPage() {
  const supabase = createClient();
  const [tenants, setTenants] = useState<TenantWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [runningSequence, setRunningSequence] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /* ---- Fetch data ------------------------------------------------ */

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch tenants
    const { data: tenantRows } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch properties
    const { data: propertyRows } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id);

    // Fetch this month's rent payments
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: payments } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('user_id', user.id)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd);

    const propMap = new Map((propertyRows || []).map((p: Record<string, any>) => [p.id, p]));
    const paymentMap = new Map((payments || []).map((p: Record<string, any>) => [p.tenant_id, p]));

    const enriched: TenantWithProperty[] = (tenantRows || []).map((t: Record<string, any>) => ({
      ...t,
      property: propMap.get(t.property_id) || null,
      currentPayment: paymentMap.get(t.id) || null,
    }));

    setTenants(enriched);
    setProperties(propertyRows || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---- Derived data ---------------------------------------------- */

  const activeTenants = tenants.filter((t) => t.status === 'active');
  const totalUnits = properties.reduce((sum, p) => {
    if (p.property_type === 'multi_family') return sum + (p.bedrooms || 1);
    return sum + 1;
  }, 0);
  const occupiedUnits = activeTenants.length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const lateTenants = tenants.filter((t) => {
    const ps = getPaymentStatus(t.currentPayment);
    return ps.variant === 'danger';
  });

  const overdueTotal = lateTenants.reduce((sum, t) => sum + (t.currentPayment?.amount || 0), 0);

  const paidThisMonth = tenants.filter((t) => t.currentPayment?.status === 'paid').length;
  const totalWithPayments = tenants.filter((t) => t.currentPayment).length;
  const collectionRate = totalWithPayments > 0 ? Math.round((paidThisMonth / totalWithPayments) * 100) : 100;

  const avgDaysToFill = 18; // Placeholder - would compute from vacancy history

  /* ---- Filtered + searched tenants ------------------------------- */

  const filteredTenants = tenants.filter((t) => {
    // Apply filter
    switch (activeFilter) {
      case 'current':
        if (t.status !== 'active') return false;
        break;
      case 'late':
        if (getPaymentStatus(t.currentPayment).variant !== 'danger') return false;
        break;
      case 'expiring': {
        const days = getDaysRemaining(t.lease_end);
        if (days === null || days > 60 || days <= 0) return false;
        break;
      }
      case 'vacant':
        if (t.status !== 'past' && t.status !== 'pending') return false;
        break;
      default:
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
      const addr = t.property
        ? `${t.property.address} ${t.property.city} ${t.property.state}`.toLowerCase()
        : '';
      if (!fullName.includes(q) && !addr.includes(q) && !(t.email || '').toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  /* ---- Filter counts --------------------------------------------- */

  const filterCounts: Record<FilterKey, number> = {
    all: tenants.length,
    current: tenants.filter((t) => t.status === 'active').length,
    late: lateTenants.length,
    expiring: tenants.filter((t) => {
      const d = getDaysRemaining(t.lease_end);
      return d !== null && d <= 60 && d > 0;
    }).length,
    vacant: tenants.filter((t) => t.status === 'past' || t.status === 'pending').length,
  };

  /* ---- Run collection sequence ----------------------------------- */

  async function handleRunCollection() {
    setRunningSequence(true);
    try {
      await fetch('/api/agents/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rent_collection',
          tenantIds: lateTenants.map((t) => t.id),
        }),
      });
    } catch {
      // handle error silently
    }
    setRunningSequence(false);
  }

  /* ---- Loading state --------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-border/50 rounded animate-pulse" />
          <div className="h-10 w-32 bg-border/50 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-full bg-border/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Empty state ------------------------------------------------ */

  if (tenants.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl text-white">Tenants</h1>
          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {}}
          >
            Add Tenant
          </Button>
        </div>

        <EmptyState
          icon={<Users />}
          title="No tenants yet"
          description="Add your first tenant to start managing leases, collecting rent, and communicating with your renters."
          action={{
            label: 'Add your first tenant',
            onClick: () => {},
            icon: <Plus />,
          }}
        />
      </div>
    );
  }

  /* ---- Main render ------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-white">Tenants</h1>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {}}
        >
          Add Tenant
        </Button>
      </div>

      {/* ============================================================ */}
      {/*  STATS ROW                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Tenants */}
        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <Users className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="label">Total Tenants</p>
            <p className="text-xl font-bold font-mono text-white">{tenants.length}</p>
            <p className="text-[10px] font-body text-muted">{activeTenants.length} active</p>
          </div>
        </Card>

        {/* Occupancy Rate */}
        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 shrink-0">
            <Building2 className="h-5 w-5 text-green" />
          </div>
          <div>
            <p className="label">Occupancy Rate</p>
            <p className="text-xl font-bold font-mono text-white">{occupancyRate}%</p>
            <p className="text-[10px] font-body text-muted">{occupiedUnits}/{totalUnits} units</p>
          </div>
        </Card>

        {/* Avg Days to Fill Vacancy */}
        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <Clock className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="label">Avg Days to Fill</p>
            <p className="text-xl font-bold font-mono text-white">{avgDaysToFill}</p>
            <p className="text-[10px] font-body text-muted">vacancy turnaround</p>
          </div>
        </Card>

        {/* Rent Collection Rate */}
        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 shrink-0">
            <TrendingUp className="h-5 w-5 text-green" />
          </div>
          <div>
            <p className="label">Collection Rate</p>
            <p className="text-xl font-bold font-mono text-white">{collectionRate}%</p>
            <p className="text-[10px] font-body text-muted">{paidThisMonth}/{totalWithPayments} paid this month</p>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  RENT COLLECTION ALERT                                        */}
      {/* ============================================================ */}
      {lateTenants.length > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-red/30 bg-red/5 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-red shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {lateTenants.length} payment{lateTenants.length > 1 ? 's' : ''} overdue totaling{' '}
              <span className="text-red font-mono">{formatCurrency(overdueTotal)}</span>
            </p>
            <p className="text-xs text-muted mt-0.5">
              Automated AI collection sequences can recover late payments via email, SMS, and voice.
            </p>
          </div>
          <Button
            size="sm"
            loading={runningSequence}
            onClick={handleRunCollection}
          >
            Run AI Collection Sequence
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  FILTER BAR + SEARCH                                          */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium font-body',
                'transition-all duration-200 ease-out',
                'inline-flex items-center gap-1.5',
                activeFilter === f.key
                  ? 'bg-gold text-black'
                  : 'bg-card border border-border text-muted hover:text-white hover:border-gold/30',
              )}
            >
              {f.label}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold font-mono',
                activeFilter === f.key
                  ? 'bg-black/20 text-black'
                  : 'bg-border text-muted',
              )}>
                {filterCounts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'h-9 w-64 pl-9 pr-4 rounded-lg text-sm font-body',
              'bg-card border border-border text-white placeholder:text-muted',
              'focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/30',
              'transition-all duration-200',
            )}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  TENANT CARDS GRID                                            */}
      {/* ============================================================ */}
      {filteredTenants.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted text-sm font-body">
            No tenants match the selected filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => {
            const paymentStatus = getPaymentStatus(tenant.currentPayment);
            const daysRemaining = getDaysRemaining(tenant.lease_end);
            const leaseColor = getLeaseColor(daysRemaining);
            const screeningScore = tenant.screening_data?.overall_score;

            return (
              <Link
                key={tenant.id}
                href={`/tenants/${tenant.id}`}
                className="block"
              >
                <Card
                  variant="interactive"
                  className="h-full rounded-lg"
                  style={{ background: '#0C1018', border: '1px solid #161E2A' }}
                >
                  {/* Top row: name + payment status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-body font-semibold text-base text-white">
                        {tenant.first_name} {tenant.last_name}
                      </h3>
                      <p className="text-xs font-body text-muted mt-0.5 truncate">
                        {tenant.property?.address
                          ? `${tenant.property.address}, ${tenant.property.city}, ${tenant.property.state}`
                          : 'No property assigned'}
                      </p>
                    </div>
                    <span className={cn(
                      'font-mono text-[10px] px-2 py-0.5 rounded border',
                      paymentStatus.variant === 'success' && 'bg-green/10 text-green border-green/20',
                      paymentStatus.variant === 'danger' && 'bg-red/10 text-red border-red/20',
                      paymentStatus.variant === 'warning' && 'bg-gold/10 text-gold border-gold/20',
                      paymentStatus.variant === 'default' && 'bg-muted/10 text-muted border-muted/20',
                    )}>
                      {paymentStatus.label}
                    </span>
                  </div>

                  {/* Monthly rent */}
                  <p className="text-2xl font-bold font-mono text-white mb-3">
                    {formatCurrency(tenant.monthly_rent)}
                    <span className="text-xs text-muted font-normal ml-1">/mo</span>
                  </p>

                  {/* Lease dates */}
                  <div className="flex items-center gap-4 text-xs font-mono text-muted mb-3">
                    <span>
                      Lease: {formatDate(tenant.lease_start)} - {formatDate(tenant.lease_end)}
                    </span>
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {daysRemaining !== null && (
                      <Badge variant={leaseColor} size="sm">
                        {daysRemaining > 0
                          ? `${daysRemaining}d remaining`
                          : 'Lease expired'}
                      </Badge>
                    )}

                    {screeningScore !== undefined && screeningScore !== null && (
                      <Badge
                        variant={screeningScore >= 70 ? 'success' : screeningScore >= 40 ? 'warning' : 'danger'}
                        size="sm"
                      >
                        Score: {screeningScore}
                      </Badge>
                    )}
                  </div>

                  {/* Quick action row */}
                  <div className="flex items-center gap-2 border-t border-border pt-3" style={{ borderColor: '#161E2A' }}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (tenant.email) {
                          window.location.href = `mailto:${tenant.email}`;
                        }
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'text-muted hover:text-white hover:bg-white/5',
                        'transition-colors duration-150',
                      )}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (tenant.phone) {
                          window.location.href = `tel:${tenant.phone}`;
                        }
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'text-muted hover:text-white hover:bg-white/5',
                        'transition-colors duration-150',
                      )}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </button>
                    <Link
                      href={`/tenants/${tenant.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'text-gold hover:text-gold-light hover:bg-gold/5',
                        'transition-colors duration-150 ml-auto',
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </Link>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
