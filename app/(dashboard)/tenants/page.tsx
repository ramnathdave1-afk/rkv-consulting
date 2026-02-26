'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Phone,
  MessageSquare,
  Eye,
  AlertTriangle,
  Building2,
  Clock,
  TrendingUp,
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
    return { label: `Late ${daysLate} days`, variant: 'danger', daysLate };
  }

  if (payment.status === 'partial') {
    return { label: 'Partial', variant: 'warning' };
  }

  // pending - check if due date is approaching
  const now = new Date();
  const due = new Date(payment.due_date);
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilDue < 0) {
    return { label: `Late ${Math.abs(daysUntilDue)} days`, variant: 'danger', daysLate: Math.abs(daysUntilDue) };
  }
  if (daysUntilDue <= 5) {
    return { label: 'Due Soon', variant: 'warning' };
  }
  return { label: 'Pending', variant: 'default' };
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
  { key: 'expiring', label: 'Lease Expiring Soon' },
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

  const paidThisMonth = tenants.filter((t) => t.currentPayment?.status === 'paid').length;
  const totalWithPayments = tenants.filter((t) => t.currentPayment).length;
  const collectionRate = totalWithPayments > 0 ? Math.round((paidThisMonth / totalWithPayments) * 100) : 100;

  const avgDaysToFill = 18; // Placeholder - would compute from vacancy history

  /* ---- Filtered tenants ------------------------------------------ */

  const filteredTenants = tenants.filter((t) => {
    switch (activeFilter) {
      case 'current':
        return t.status === 'active';
      case 'late':
        return getPaymentStatus(t.currentPayment).variant === 'danger';
      case 'expiring': {
        const days = getDaysRemaining(t.lease_end);
        return days !== null && days <= 90 && days > 0;
      }
      case 'vacant':
        return t.status === 'past' || t.status === 'pending';
      default:
        return true;
    }
  });

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
        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <Users className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Total Tenants</p>
            <p className="text-xl font-bold text-white">{tenants.length}</p>
          </div>
        </Card>

        {/* Occupancy Rate */}
        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 shrink-0">
            <Building2 className="h-5 w-5 text-green" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Occupancy Rate</p>
            <p className="text-xl font-bold text-white">{occupancyRate}%</p>
          </div>
        </Card>

        {/* Avg Days to Fill Vacancy */}
        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <Clock className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Avg Days to Fill</p>
            <p className="text-xl font-bold text-white">{avgDaysToFill}</p>
          </div>
        </Card>

        {/* Rent Collection Rate */}
        <Card className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 shrink-0">
            <TrendingUp className="h-5 w-5 text-green" />
          </div>
          <div>
            <p className="text-xs text-muted font-body">Collection Rate</p>
            <p className="text-xl font-bold text-white">{collectionRate}%</p>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/*  FILTER BAR                                                   */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium font-body',
              'transition-all duration-200 ease-out',
              activeFilter === f.key
                ? 'bg-gold text-black'
                : 'bg-card border border-border text-muted hover:text-white hover:border-gold/30',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  RENT COLLECTION ALERT                                        */}
      {/* ============================================================ */}
      {lateTenants.length > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-red/30 bg-red/5 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-red shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {lateTenants.length} tenant{lateTenants.length > 1 ? 's are' : ' is'} late on rent.{' '}
              <span className="text-muted font-normal">Run AI collection sequence?</span>
            </p>
          </div>
          <Button
            size="sm"
            loading={runningSequence}
            onClick={handleRunCollection}
          >
            Run Collection Sequence
          </Button>
        </div>
      )}

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
                  className="h-full"
                >
                  {/* Name + Address */}
                  <div className="mb-4">
                    <h3 className="font-display font-semibold text-base text-white">
                      {tenant.first_name} {tenant.last_name}
                    </h3>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {tenant.property?.address
                        ? `${tenant.property.address}, ${tenant.property.city}, ${tenant.property.state}`
                        : 'No property assigned'}
                    </p>
                  </div>

                  {/* Monthly rent */}
                  <p className="text-2xl font-bold text-white mb-3">
                    {formatCurrency(tenant.monthly_rent)}
                    <span className="text-xs text-muted font-normal ml-1">/mo</span>
                  </p>

                  {/* Payment status + Lease end row */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge
                      variant={paymentStatus.variant}
                      size="sm"
                      dot
                    >
                      {paymentStatus.label}
                    </Badge>

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

                  {/* Lease end date */}
                  <p className="text-xs text-muted mb-4">
                    Lease ends {formatDate(tenant.lease_end)}
                  </p>

                  {/* Quick action row */}
                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'text-muted hover:text-white hover:bg-white/5',
                        'transition-colors duration-150',
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Message
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                        'text-muted hover:text-white hover:bg-white/5',
                        'transition-colors duration-150',
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
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
