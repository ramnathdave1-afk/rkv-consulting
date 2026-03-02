'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CheckSquare,
  Square,
  Download,
  Send,
  PhoneCall,
  X,
  Bot,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
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

function getPaymentStatus(
  payment: RentPayment | null | undefined,
  tenant: TenantWithProperty,
): {
  label: string;
  variant: 'success' | 'danger' | 'warning' | 'default';
  daysLate?: number;
} {
  if (!payment) {
    // Instead of "No Data" — show something meaningful
    const daysLeft = getDaysRemaining(tenant.lease_end);
    if (tenant.status === 'past') return { label: 'Moved Out', variant: 'default' };
    if (tenant.status === 'pending') return { label: 'Pending', variant: 'warning' };
    if (daysLeft !== null && daysLeft <= 30 && daysLeft > 0)
      return { label: `Renews ${daysLeft}d`, variant: 'warning' };
    if (tenant.status === 'active') return { label: 'Active', variant: 'success' };
    return { label: tenant.status || 'Active', variant: 'default' };
  }

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

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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

  // Add Tenant modal
  const [addTenantOpen, setAddTenantOpen] = useState(false);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Email modal
  const [emailModal, setEmailModal] = useState<{
    open: boolean;
    tenant: TenantWithProperty | null;
    subject: string;
    body: string;
    generating: boolean;
    sending: boolean;
    sent: boolean;
  }>({ open: false, tenant: null, subject: '', body: '', generating: false, sending: false, sent: false });

  // Call modal (desktop)
  const [callModal, setCallModal] = useState<{
    open: boolean;
    tenant: TenantWithProperty | null;
    callingAI: boolean;
  }>({ open: false, tenant: null, callingAI: false });

  /* ---- Fetch data ------------------------------------------------ */

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tenantRows } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const { data: propertyRows } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id);

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
  // FIX: Cap occupancy at 100%. If over 100%, log error.
  const rawOccupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const occupancyRate = Math.min(rawOccupancy, 100);
  if (rawOccupancy > 100) {
    console.error(`[Tenants] Occupancy rate exceeds 100%: ${rawOccupancy}% (${occupiedUnits}/${totalUnits}). Data error — showing 100%.`);
  }

  const lateTenants = tenants.filter((t) => {
    const ps = getPaymentStatus(t.currentPayment, t);
    return ps.variant === 'danger';
  });

  const overdueTotal = lateTenants.reduce((sum, t) => sum + (t.currentPayment?.amount_due || t.monthly_rent || 0), 0);

  const paidThisMonth = tenants.filter((t) => t.currentPayment?.status === 'paid').length;
  const totalWithPayments = tenants.filter((t) => t.currentPayment).length;
  const collectionRate = totalWithPayments > 0 ? Math.round((paidThisMonth / totalWithPayments) * 100) : 100;

  const avgDaysToFill = 18;

  /* ---- Filtered + searched tenants ------------------------------- */

  const filteredTenants = useMemo(() => tenants.filter((t) => {
    switch (activeFilter) {
      case 'current':
        if (t.status !== 'active') return false;
        break;
      case 'late':
        if (getPaymentStatus(t.currentPayment, t).variant !== 'danger') return false;
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
  }), [tenants, activeFilter, searchQuery]);

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

  /* ---- Selection helpers ----------------------------------------- */

  const allFilteredSelected = filteredTenants.length > 0 && filteredTenants.every((t) => selectedIds.has(t.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTenants.map((t) => t.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTenants = tenants.filter((t) => selectedIds.has(t.id));

  /* ---- Run collection sequence ----------------------------------- */

  async function handleRunCollection(tenantIds?: string[]) {
    setRunningSequence(true);
    try {
      const ids = tenantIds || lateTenants.map((t) => t.id);
      for (const id of ids) {
        await fetch('/api/agents/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: id, templateType: 'late_rent' }),
        });
      }
    } catch {
      // silently handle
    }
    setRunningSequence(false);
  }

  /* ---- Email modal handlers -------------------------------------- */

  async function openEmailModal(tenant: TenantWithProperty) {
    setEmailModal({
      open: true,
      tenant,
      subject: '',
      body: '',
      generating: true,
      sending: false,
      sent: false,
    });

    try {
      const res = await fetch('/api/agents/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          templateType: 'general',
          dryRun: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmailModal((prev) => ({
          ...prev,
          subject: data.subject || `Regarding your tenancy at ${tenant.property?.address || 'your property'}`,
          body: data.text || data.body || `Hi ${tenant.first_name},\n\nI hope this message finds you well. I wanted to reach out regarding your tenancy.\n\nPlease let me know if you have any questions or concerns.\n\nBest regards`,
          generating: false,
        }));
      } else {
        // Fallback draft
        setEmailModal((prev) => ({
          ...prev,
          subject: `Regarding your tenancy at ${tenant.property?.address || 'your property'}`,
          body: `Hi ${tenant.first_name},\n\nI hope this message finds you well. I wanted to reach out regarding your tenancy at ${tenant.property?.address || 'your property'}.\n\nPlease let me know if you have any questions or concerns.\n\nBest regards`,
          generating: false,
        }));
      }
    } catch {
      setEmailModal((prev) => ({
        ...prev,
        subject: `Regarding your tenancy at ${tenant.property?.address || 'your property'}`,
        body: `Hi ${tenant.first_name},\n\nI hope this message finds you well.\n\nBest regards`,
        generating: false,
      }));
    }
  }

  async function handleSendEmail() {
    if (!emailModal.tenant) return;
    setEmailModal((prev) => ({ ...prev, sending: true }));

    try {
      await fetch('/api/agents/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: emailModal.tenant.id,
          templateType: 'general',
          customContent: emailModal.body,
        }),
      });
      setEmailModal((prev) => ({ ...prev, sending: false, sent: true }));
      setTimeout(() => {
        setEmailModal({ open: false, tenant: null, subject: '', body: '', generating: false, sending: false, sent: false });
      }, 1500);
    } catch {
      setEmailModal((prev) => ({ ...prev, sending: false }));
    }
  }

  /* ---- Call modal handlers --------------------------------------- */

  function handleCallClick(tenant: TenantWithProperty) {
    if (!tenant.phone) return;

    if (isMobileDevice()) {
      window.location.href = `tel:${tenant.phone}`;
    } else {
      setCallModal({ open: true, tenant, callingAI: false });
    }
  }

  async function handleAICall() {
    if (!callModal.tenant) return;
    setCallModal((prev) => ({ ...prev, callingAI: true }));

    try {
      await fetch('/api/agents/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: callModal.tenant.id,
          purpose: 'general',
        }),
      });
    } catch {
      // silently handle
    }
    setCallModal((prev) => ({ ...prev, callingAI: false }));
  }

  /* ---- Export CSV ------------------------------------------------- */

  function exportSelectedCSV() {
    const rows = selectedTenants.map((t) => ({
      Name: `${t.first_name} ${t.last_name}`,
      Email: t.email || '',
      Phone: t.phone || '',
      Property: t.property?.address || '',
      City: t.property?.city || '',
      State: t.property?.state || '',
      'Monthly Rent': t.monthly_rent,
      Status: t.status,
      'Lease Start': t.lease_start || '',
      'Lease End': t.lease_end || '',
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? '')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---- Bulk actions for selected late tenants -------------------- */

  async function handleBulkRentReminder() {
    setRunningSequence(true);
    const ids = selectedTenants.map((t) => t.id);
    for (const id of ids) {
      try {
        await fetch('/api/agents/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: id, templateType: 'late_rent' }),
        });
      } catch { /* continue */ }
    }
    setRunningSequence(false);
    setSelectedIds(new Set());
  }

  async function handleBulkLeaseRenewal() {
    setRunningSequence(true);
    const ids = selectedTenants.map((t) => t.id);
    for (const id of ids) {
      try {
        await fetch('/api/agents/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: id, templateType: 'lease_renewal' }),
        });
      } catch { /* continue */ }
    }
    setRunningSequence(false);
    setSelectedIds(new Set());
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
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-2xl text-white">Tenants</h1>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddTenantOpen(true)}>
            Add Tenant
          </Button>
        </div>
        <EmptyState
          icon={<Users />}
          title="No tenants yet"
          description="Add your first tenant to start managing leases, collecting rent, and communicating with your renters."
          action={{ label: 'Add your first tenant', onClick: () => setAddTenantOpen(true), icon: <Plus /> }}
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
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddTenantOpen(true)}>
          Add Tenant
        </Button>
      </div>

      {/* ============================================================ */}
      {/*  STATS ROW                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <Users className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="label">Total Tenants</p>
            <p className="text-xl font-bold font-mono text-white">{tenants.length}</p>
            <p className="text-[10px] font-body text-muted">{activeTenants.length} active</p>
          </div>
        </Card>

        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10 shrink-0">
            <Building2 className="h-5 w-5 text-green" />
          </div>
          <div>
            <p className="label">Occupancy Rate</p>
            <p className="text-xl font-bold font-mono text-white">{occupancyRate}%</p>
            <p className="text-[10px] font-body text-muted">{occupiedUnits}/{totalUnits} units</p>
          </div>
        </Card>

        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 shrink-0">
            <Clock className="h-5 w-5 text-gold" />
          </div>
          <div>
            <p className="label">Avg Days to Fill</p>
            <p className="text-xl font-bold font-mono text-white">{avgDaysToFill}</p>
            <p className="text-[10px] font-body text-muted">vacancy turnaround</p>
          </div>
        </Card>

        <Card className="rounded-lg flex items-center gap-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
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
      {/*  LATE RENT CTA BANNER                                         */}
      {/* ============================================================ */}
      {activeFilter === 'late' && lateTenants.length > 0 && (
        <div className="rounded-xl border-2 border-gold/40 bg-gold/5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red/10 shrink-0">
              <AlertTriangle className="h-6 w-6 text-red" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-white">
                {lateTenants.length} tenant{lateTenants.length > 1 ? 's are' : ' is'} late on rent
              </p>
              <p className="text-sm text-muted mt-0.5">
                Total overdue: <span className="text-red font-mono font-bold">{formatCurrency(overdueTotal)}</span>
              </p>
            </div>
            <Button
              size="lg"
              loading={runningSequence}
              onClick={() => handleRunCollection()}
              icon={!runningSequence ? <Send className="w-4 h-4" /> : undefined}
            >
              Run Collection Sequence for All
            </Button>
          </div>
        </div>
      )}

      {/* Standard alert for non-filtered view */}
      {activeFilter !== 'late' && lateTenants.length > 0 && (
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
            onClick={() => handleRunCollection()}
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
          {/* Select All checkbox */}
          <button
            onClick={toggleSelectAll}
            className={cn(
              'p-1.5 rounded-lg transition-colors duration-150',
              'text-muted hover:text-white hover:bg-white/5',
            )}
            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
          >
            {allFilteredSelected ? (
              <CheckSquare className="h-4 w-4 text-gold" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>

          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setActiveFilter(f.key); setSelectedIds(new Set()); }}
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
      {/*  BULK ACTION BAR                                              */}
      {/* ============================================================ */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-5 py-3">
          <CheckSquare className="h-4 w-4 text-gold shrink-0" />
          <span className="text-sm font-medium text-white">
            {selectedIds.size} tenant{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            loading={runningSequence}
            onClick={handleBulkRentReminder}
            icon={!runningSequence ? <Send className="w-3.5 h-3.5" /> : undefined}
          >
            Send Rent Reminder to {selectedIds.size}
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={runningSequence}
            onClick={handleBulkLeaseRenewal}
            icon={!runningSequence ? <Mail className="w-3.5 h-3.5" /> : undefined}
          >
            Send Lease Renewal to {selectedIds.size}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={exportSelectedCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
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
            const paymentStatus = getPaymentStatus(tenant.currentPayment, tenant);
            const daysRemaining = getDaysRemaining(tenant.lease_end);
            const leaseColor = getLeaseColor(daysRemaining);
            const screeningScore = tenant.screening_data?.overall_score;
            const isSelected = selectedIds.has(tenant.id);

            return (
              <div key={tenant.id} className="relative">
                {/* Selection checkbox overlay */}
                <button
                  onClick={(e) => { e.preventDefault(); toggleSelect(tenant.id); }}
                  className={cn(
                    'absolute top-3 left-3 z-10 p-0.5 rounded transition-colors duration-150',
                    isSelected ? 'text-gold' : 'text-muted/40 hover:text-muted',
                  )}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                <Link href={`/tenants/${tenant.id}`} className="block">
                  <Card
                    variant="interactive"
                    className={cn('h-full rounded-lg', isSelected && 'ring-1 ring-gold/40')}
                    style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                  >
                    {/* Top row: name + payment status */}
                    <div className="flex items-start justify-between mb-3 pl-5">
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
                        'font-mono text-[10px] px-2 py-0.5 rounded border shrink-0',
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
                          {daysRemaining > 0 ? `${daysRemaining}d remaining` : 'Lease expired'}
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
                    <div className="flex items-center gap-2 border-t border-border pt-3" style={{ borderColor: '#1e1e1e' }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openEmailModal(tenant);
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
                          handleCallClick(tenant);
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
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/*  EMAIL MODAL                                                  */}
      {/* ============================================================ */}
      <Modal open={emailModal.open} onOpenChange={() => setEmailModal({ open: false, tenant: null, subject: '', body: '', generating: false, sending: false, sent: false })}>
        <ModalHeader
          title={`Email ${emailModal.tenant?.first_name || ''} ${emailModal.tenant?.last_name || ''}`}
          description={emailModal.tenant?.email || 'No email on file'}
        />
        <ModalContent>
          {emailModal.generating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 text-gold animate-spin" />
              <p className="text-sm text-muted font-body">AI is drafting your email...</p>
            </div>
          ) : emailModal.sent ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-12 w-12 rounded-full bg-green/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-green" />
              </div>
              <p className="text-sm text-white font-body font-medium">Email sent successfully</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted font-body">
                <Bot className="h-3.5 w-3.5 text-gold" />
                AI-drafted based on tenant context. Edit before sending.
              </div>
              <div>
                <label className="label block mb-1.5">Subject</label>
                <input
                  value={emailModal.subject}
                  onChange={(e) => setEmailModal((p) => ({ ...p, subject: e.target.value }))}
                  className={cn(
                    'w-full h-10 px-3 rounded-lg text-sm font-body',
                    'bg-black border border-border text-white',
                    'focus:outline-none focus:border-gold/50',
                  )}
                />
              </div>
              <div>
                <label className="label block mb-1.5">Message</label>
                <textarea
                  value={emailModal.body}
                  onChange={(e) => setEmailModal((p) => ({ ...p, body: e.target.value }))}
                  rows={8}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg text-sm font-body',
                    'bg-black border border-border text-white resize-y',
                    'focus:outline-none focus:border-gold/50',
                  )}
                />
              </div>
            </div>
          )}
        </ModalContent>
        {!emailModal.generating && !emailModal.sent && (
          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setEmailModal({ open: false, tenant: null, subject: '', body: '', generating: false, sending: false, sent: false })}
            >
              Cancel
            </Button>
            <Button
              loading={emailModal.sending}
              onClick={handleSendEmail}
              disabled={!emailModal.tenant?.email}
              icon={!emailModal.sending ? <Send className="w-4 h-4" /> : undefined}
            >
              Send Email
            </Button>
          </ModalFooter>
        )}
      </Modal>

      {/* ============================================================ */}
      {/*  CALL MODAL (Desktop)                                         */}
      {/* ============================================================ */}
      <Modal open={callModal.open} onOpenChange={() => setCallModal({ open: false, tenant: null, callingAI: false })}>
        <ModalHeader
          title={`Call ${callModal.tenant?.first_name || ''} ${callModal.tenant?.last_name || ''}`}
          description="Phone number on file"
        />
        <ModalContent>
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="h-16 w-16 rounded-full bg-gold/10 flex items-center justify-center">
              <Phone className="h-7 w-7 text-gold" />
            </div>
            <p className="text-2xl font-mono font-bold text-white tracking-wider">
              {callModal.tenant?.phone || 'No phone'}
            </p>
            <p className="text-sm text-muted font-body">
              {callModal.tenant?.property?.address
                ? `Tenant at ${callModal.tenant.property.address}`
                : 'Tenant'}
            </p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setCallModal({ open: false, tenant: null, callingAI: false })}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            loading={callModal.callingAI}
            onClick={handleAICall}
            icon={!callModal.callingAI ? <PhoneCall className="w-4 h-4" /> : undefined}
          >
            AI Voice Agent Call
          </Button>
          <Button
            onClick={() => {
              if (callModal.tenant?.phone) {
                window.location.href = `tel:${callModal.tenant.phone}`;
              }
            }}
            icon={<Phone className="w-4 h-4" />}
          >
            Dial Number
          </Button>
        </ModalFooter>
      </Modal>

      {/* ============================================================ */}
      {/*  ADD TENANT MODAL                                             */}
      {/* ============================================================ */}
      <AddTenantModal
        open={addTenantOpen}
        onOpenChange={setAddTenantOpen}
        onSaved={fetchData}
        properties={properties}
        supabase={supabase}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Tenant Modal                                                   */
/* ------------------------------------------------------------------ */

function AddTenantModal({
  open,
  onOpenChange,
  onSaved,
  properties,
  supabase,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  properties: Property[];
  supabase: ReturnType<typeof createClient>;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    property_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lease_start: '',
    lease_end: '',
    monthly_rent: '',
    security_deposit: '',
    notes: '',
  });

  function resetForm() {
    setForm({
      property_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      lease_start: '',
      lease_end: '',
      monthly_rent: '',
      security_deposit: '',
      notes: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.property_id || !form.first_name) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('tenants').insert({
        user_id: user.id,
        property_id: form.property_id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        lease_start: form.lease_start || null,
        lease_end: form.lease_end || null,
        monthly_rent: form.monthly_rent ? parseFloat(form.monthly_rent) : 0,
        security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        notes: form.notes.trim() || null,
        status: 'active',
      });

      if (error) {
        console.error('Add tenant error:', error);
        return;
      }

      resetForm();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('Add tenant error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader title="Add Tenant" />
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Property */}
          <div>
            <label className="label mb-1 block">Property *</label>
            <select
              value={form.property_id}
              onChange={(e) => setForm((p) => ({ ...p, property_id: e.target.value }))}
              className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              required
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address}{p.city ? `, ${p.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">First Name *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
                required
              />
            </div>
            <div>
              <label className="label mb-1 block">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="label mb-1 block">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {/* Lease Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">Lease Start</label>
              <input
                type="date"
                value={form.lease_start}
                onChange={(e) => setForm((p) => ({ ...p, lease_start: e.target.value }))}
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="label mb-1 block">Lease End</label>
              <input
                type="date"
                value={form.lease_end}
                onChange={(e) => setForm((p) => ({ ...p, lease_end: e.target.value }))}
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1 block">Monthly Rent</label>
              <input
                type="number"
                value={form.monthly_rent}
                onChange={(e) => setForm((p) => ({ ...p, monthly_rent: e.target.value }))}
                placeholder="0"
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="label mb-1 block">Security Deposit</label>
              <input
                type="number"
                value={form.security_deposit}
                onChange={(e) => setForm((p) => ({ ...p, security_deposit: e.target.value }))}
                placeholder="0"
                className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-gold/40 resize-none"
            />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={(e: React.MouseEvent) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }} disabled={saving || !form.property_id || !form.first_name}>
            {saving ? 'Saving...' : 'Add Tenant'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
