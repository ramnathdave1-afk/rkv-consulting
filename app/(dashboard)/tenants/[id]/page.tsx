'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  FileText,
  DollarSign,
  MessageSquare,
  Wrench,
  Upload,
  Download,
  Eye,
  Play,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  PhoneCall,
  Link as LinkIcon,
  AlertTriangle,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal, ModalContent, ModalHeader, ModalFooter } from '@/components/ui/Modal';
import type {
  Tenant,
  Property,
  RentPayment,
  MaintenanceRequest,
  AgentLog,
  Document as DocType,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDaysRemaining(leaseEnd: string | null): number | null {
  if (!leaseEnd) return null;
  const end = new Date(leaseEnd);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getLeaseProgress(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

function getLeaseDuration(start: string | null, end: string | null): string {
  if (!start || !end) return 'N/A';
  const s = new Date(start);
  const e = new Date(end);
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}yr ${rem}mo` : `${years}yr`;
  }
  return `${months}mo`;
}

/* ------------------------------------------------------------------ */
/*  Payment status badge helper                                        */
/* ------------------------------------------------------------------ */

function paymentStatusBadge(status: RentPayment['status']) {
  const map: Record<RentPayment['status'], { label: string; variant: 'success' | 'danger' | 'warning' | 'default' }> = {
    paid: { label: 'Paid', variant: 'success' },
    late: { label: 'Overdue', variant: 'danger' },
    pending: { label: 'Pending', variant: 'warning' },
    partial: { label: 'Partial', variant: 'warning' },
    waived: { label: 'Waived', variant: 'default' },
  };
  return map[status] || { label: status, variant: 'default' };
}

/* ------------------------------------------------------------------ */
/*  Maintenance status config                                          */
/* ------------------------------------------------------------------ */

const maintenanceStatusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-red' },
  in_progress: { label: 'In Progress', color: 'text-gold' },
  awaiting_parts: { label: 'Awaiting Parts', color: 'text-gold' },
  scheduled: { label: 'Scheduled', color: 'text-muted' },
  completed: { label: 'Completed', color: 'text-green' },
  canceled: { label: 'Canceled', color: 'text-muted' },
};

const maintenancePriorityConfig: Record<string, { label: string; variant: 'danger' | 'warning' | 'default' | 'success' }> = {
  urgent: { label: 'Urgent', variant: 'danger' },
  high: { label: 'High', variant: 'danger' },
  medium: { label: 'Medium', variant: 'warning' },
  low: { label: 'Low', variant: 'default' },
};

/* ------------------------------------------------------------------ */
/*  Info row component                                                 */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex justify-between items-center', className)}>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-white font-medium font-mono text-right">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const tenantId = params.id as string;

  /* ---- State ----------------------------------------------------- */

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [manualPayment, setManualPayment] = useState({ amount: '', date: '', method: 'bank_transfer' });

  /* ---- Fetch all data -------------------------------------------- */

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!tenantData) {
      setLoading(false);
      return;
    }

    setTenant(tenantData);

    // Property
    if (tenantData.property_id) {
      const { data: propData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', tenantData.property_id)
        .single();
      setProperty(propData || null);
    }

    // Payments
    const { data: paymentData } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false });
    setPayments(paymentData || []);

    // Maintenance - fetch by property_id so we get all requests for the tenant's property
    if (tenantData.property_id) {
      const { data: maintenanceData } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('property_id', tenantData.property_id)
        .order('created_at', { ascending: false });
      setMaintenanceRequests(maintenanceData || []);
    }

    // Agent logs
    const { data: logData } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter agent logs related to this tenant
    const tenantLogs = (logData || []).filter((log: Record<string, any>) => {
      const input = log.input as Record<string, unknown> | null;
      const output = log.output as Record<string, unknown> | null;
      return (
        (input && (input.tenant_id === tenantId || input.tenantId === tenantId)) ||
        (output && (output.tenant_id === tenantId || output.tenantId === tenantId))
      );
    });
    setAgentLogs(tenantLogs);

    // Documents
    const { data: docData } = await supabase
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    setDocuments(docData || []);

    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ---- Manual payment handler ------------------------------------ */

  async function handleLogPayment() {
    if (!tenant || !manualPayment.amount || !manualPayment.date) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('rent_payments').insert({
      user_id: user.id,
      tenant_id: tenant.id,
      property_id: tenant.property_id,
      amount_due: parseFloat(manualPayment.amount),
      amount_paid: parseFloat(manualPayment.amount),
      due_date: manualPayment.date,
      paid_date: manualPayment.date,
      status: 'paid',
      payment_method: manualPayment.method,
    });

    setPaymentModalOpen(false);
    setManualPayment({ amount: '', date: '', method: 'bank_transfer' });
    fetchAll();
  }

  /* ---- File upload handler --------------------------------------- */

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = `${user.id}/tenants/${tenant.id}/${Date.now()}_${file.name}`;
    const { data: uploadData } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      await supabase.from('documents').insert({
        user_id: user.id,
        tenant_id: tenant.id,
        property_id: tenant.property_id,
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size: file.size,
        category: 'other',
      });

      fetchAll();
    }
  }

  /* ---- Loading --------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-5 w-5 bg-border/50 rounded animate-pulse" />
          <div className="h-8 w-64 bg-border/50 rounded animate-pulse" />
        </div>
        <div className="h-12 w-full bg-border/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-border/50 rounded-xl animate-pulse" />
          <div className="h-64 bg-border/50 rounded-xl animate-pulse" />
        </div>
        <div className="h-96 w-full bg-border/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  /* ---- Not found ------------------------------------------------- */

  if (!tenant) {
    return (
      <EmptyState
        icon={<User />}
        title="Tenant not found"
        description="This tenant may have been removed or you do not have access."
        action={{
          label: 'Back to Tenants',
          onClick: () => router.push('/tenants'),
        }}
      />
    );
  }

  /* ---- Derived values -------------------------------------------- */

  const daysRemaining = getDaysRemaining(tenant.lease_end);
  const leaseProgress = getLeaseProgress(tenant.lease_start, tenant.lease_end);
  const statusBadge = tenant.status === 'active'
    ? { label: 'Active', variant: 'success' as const }
    : tenant.status === 'pending'
      ? { label: 'Pending', variant: 'warning' as const }
      : tenant.status === 'eviction'
        ? { label: 'Eviction', variant: 'danger' as const }
        : { label: 'Past', variant: 'default' as const };

  // Payment summary
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0);
  const totalDue = payments.reduce((s, p) => s + p.amount_due, 0);
  const outstandingBalance = totalDue - totalPaid;
  const onTimePaid = payments.filter((p) => p.status === 'paid' && p.paid_date && p.paid_date <= p.due_date).length;
  const onTimeRate = payments.length > 0 ? Math.round((onTimePaid / payments.length) * 100) : 100;
  const totalLateFees = payments.reduce((s, p) => s + (p.late_fee_charged || 0), 0);
  const latePayments = payments.filter((p) => p.status === 'late' || (p.status === 'pending' && new Date(p.due_date) < new Date()));

  // Screening data
  const screening = tenant.screening_data;

  // Extended tenant data from DB (columns added in migration 007)
  const tenantAny = tenant as unknown as Record<string, unknown>;
  const emergencyContact = tenantAny.emergency_contact as { name?: string; phone?: string; relation?: string } | null;
  const vehicleInfo = tenantAny.vehicle_info as { make?: string; model?: string; plate?: string } | null;
  const extendedData = {
    emergencyContact: {
      name: emergencyContact?.name || 'Not provided',
      phone: emergencyContact?.phone || 'Not provided',
      relation: emergencyContact?.relation || 'Not provided',
    },
    vehicle: vehicleInfo ? { make: vehicleInfo.make || '', model: vehicleInfo.model || '', plate: vehicleInfo.plate || '' } : null,
    rentersInsurance: true,
    lateFeeAmount: Number(tenantAny.late_fee_amount) || 50,
    graceDays: Number(tenantAny.grace_days) || 5,
    paymentMethod: (tenantAny.payment_method as string) || 'Bank Transfer',
    depositHeld: tenant.security_deposit || 0,
  };

  // Renewal status
  const renewalStatus =
    daysRemaining === null
      ? 'unknown'
      : daysRemaining <= 0
        ? 'expired'
        : daysRemaining <= 60
          ? 'renewal_due'
          : daysRemaining <= 90
            ? 'approaching'
            : 'active';

  const renewalBadgeMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
    active: { label: 'Active', variant: 'success' },
    approaching: { label: 'Approaching Renewal', variant: 'warning' },
    renewal_due: { label: 'Renewal Due', variant: 'danger' },
    expired: { label: 'Expired', variant: 'danger' },
    unknown: { label: 'Unknown', variant: 'default' },
  };

  /* ---- Render ---------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/tenants')}
            className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-2xl text-white">
                {tenant.first_name} {tenant.last_name}
              </h1>
              <span className="inline-flex items-center gap-1.5">
                {tenant.status === 'active' && <span className="pulse-dot" />}
                <Badge variant={statusBadge.variant}>
                  {statusBadge.label}
                </Badge>
              </span>
              {screening && (
                <Badge
                  variant={screening.overall_score >= 70 ? 'success' : screening.overall_score >= 40 ? 'warning' : 'danger'}
                  size="sm"
                >
                  Score: {screening.overall_score}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted mt-0.5">
              {property
                ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
                : 'No property assigned'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon={<Mail className="w-3.5 h-3.5" />}
            onClick={() => { if (tenant.email) window.location.href = `mailto:${tenant.email}`; }}>
            Email
          </Button>
          <Button variant="ghost" size="sm" icon={<Phone className="w-3.5 h-3.5" />}
            onClick={() => { if (tenant.phone) window.location.href = `tel:${tenant.phone}`; }}>
            Call
          </Button>
          <Button variant="outline" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />}>
            Edit
          </Button>
          <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />}>
            Remove
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  TABS                                                         */}
      {/* ============================================================ */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" icon={<User className="h-4 w-4" />}>Profile</TabsTrigger>
          <TabsTrigger value="lease" icon={<FileText className="h-4 w-4" />}>Lease</TabsTrigger>
          <TabsTrigger value="payments" icon={<DollarSign className="h-4 w-4" />}>Payments</TabsTrigger>
          <TabsTrigger value="communication" icon={<MessageSquare className="h-4 w-4" />}>Communication</TabsTrigger>
          <TabsTrigger value="maintenance" icon={<Wrench className="h-4 w-4" />}>Maintenance</TabsTrigger>
          <TabsTrigger value="documents" icon={<FileText className="h-4 w-4" />}>Documents</TabsTrigger>
        </TabsList>

        {/* ========================================================== */}
        {/*  TAB 1: Profile                                             */}
        {/* ========================================================== */}
        <TabsContent value="profile">
          <div className="grid grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card
              className="rounded-lg"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              header={
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gold" />
                  <span className="label">Contact Information</span>
                </div>
              }
            >
              <div className="space-y-4">
                <InfoRow label="Full Name" value={`${tenant.first_name} ${tenant.last_name}`} />
                <InfoRow
                  label="Email"
                  value={
                    tenant.email ? (
                      <a href={`mailto:${tenant.email}`} className="text-gold hover:text-gold-light transition-colors">
                        {tenant.email}
                      </a>
                    ) : (
                      <span className="text-muted">Not provided</span>
                    )
                  }
                />
                <InfoRow
                  label="Phone"
                  value={
                    tenant.phone ? (
                      <a href={`tel:${tenant.phone}`} className="text-gold hover:text-gold-light transition-colors">
                        {tenant.phone}
                      </a>
                    ) : (
                      <span className="text-muted">Not provided</span>
                    )
                  }
                />
                <InfoRow label="Status" value={<Badge variant={statusBadge.variant} size="sm">{statusBadge.label}</Badge>} />
              </div>
            </Card>

            {/* Emergency Contact */}
            <Card
              className="rounded-lg"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              header={
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-gold" />
                  <span className="label">Emergency Contact</span>
                </div>
              }
            >
              <div className="space-y-4">
                <InfoRow label="Name" value={extendedData.emergencyContact.name} />
                <InfoRow label="Phone" value={extendedData.emergencyContact.phone} />
                <InfoRow label="Relation" value={extendedData.emergencyContact.relation} />
              </div>
            </Card>

            {/* Property Assignment */}
            <Card
              className="rounded-lg"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              header={
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gold" />
                  <span className="label">Property Assignment</span>
                </div>
              }
            >
              {property ? (
                <div className="space-y-4">
                  <InfoRow label="Address" value={property.address} />
                  <InfoRow label="City / State" value={`${property.city}, ${property.state} ${property.zip}`} />
                  <InfoRow label="Property Type" value={property.property_type.replace(/_/g, ' ')} />
                  <InfoRow label="Bedrooms" value={property.bedrooms || 'N/A'} />
                  <InfoRow label="Bathrooms" value={property.bathrooms || 'N/A'} />
                  <InfoRow label="Move-In Date" value={formatDate(tenant.lease_start)} />
                </div>
              ) : (
                <p className="text-sm text-muted">No property assigned to this tenant.</p>
              )}
            </Card>

            {/* Screening Score */}
            <Card
              className="rounded-lg"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              header={
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gold" />
                  <span className="label">Screening Score</span>
                </div>
              }
            >
              {screening ? (
                <div className="space-y-4">
                  {/* Score visual */}
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold font-mono',
                      screening.overall_score >= 70
                        ? 'bg-green/10 text-green border border-green/20'
                        : screening.overall_score >= 40
                          ? 'bg-gold/10 text-gold border border-gold/20'
                          : 'bg-red/10 text-red border border-red/20',
                    )}>
                      {screening.overall_score}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white capitalize">{screening.risk_level} Risk</p>
                      <p className="text-xs text-muted capitalize">{screening.recommendation.replace(/_/g, ' ')}</p>
                    </div>
                  </div>

                  <InfoRow label="Credit Score" value={screening.credit_score || 'N/A'} />
                  <InfoRow label="Credit Grade" value={
                    screening.credit_grade ? (
                      <span className="capitalize">{screening.credit_grade}</span>
                    ) : 'N/A'
                  } />
                  <InfoRow label="Monthly Income" value={screening.monthly_income ? formatCurrency(screening.monthly_income) : 'N/A'} />
                  <InfoRow label="Income-to-Rent Ratio" value={screening.income_to_rent_ratio ? `${screening.income_to_rent_ratio.toFixed(1)}x` : 'N/A'} />
                  <InfoRow label="Eviction History" value={
                    screening.eviction_history ? (
                      <Badge variant="danger" size="sm">Yes</Badge>
                    ) : (
                      <Badge variant="success" size="sm">None</Badge>
                    )
                  } />
                  <InfoRow label="Employment Verified" value={
                    screening.employment_verified ? (
                      <Badge variant="success" size="sm">Verified</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">Unverified</Badge>
                    )
                  } />

                  {screening.flags.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted mb-2">Flags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {screening.flags.map((flag, i) => (
                          <Badge key={i} variant="danger" size="sm">{flag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/10">
                    <Shield className="h-5 w-5 text-muted" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">No screening data available</p>
                    <p className="text-xs text-muted">Screening status: <span className="capitalize">{tenant.screening_status.replace(/_/g, ' ')}</span></p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 2: Lease                                               */}
        {/* ========================================================== */}
        <TabsContent value="lease">
          <div className="space-y-6">
            {/* Lease Timeline */}
            <Card
              className="rounded-lg"
              style={{ background: '#111111', border: '1px solid #1e1e1e' }}
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gold" />
                    <span className="label">Lease Timeline</span>
                  </div>
                  <Badge variant={renewalBadgeMap[renewalStatus].variant} size="sm">
                    {renewalBadgeMap[renewalStatus].label}
                  </Badge>
                </div>
              }
            >
              <div className="space-y-5">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="label mb-1">Start Date</p>
                    <p className="text-sm font-semibold font-mono text-white">{formatDate(tenant.lease_start)}</p>
                  </div>
                  <div>
                    <p className="label mb-1">End Date</p>
                    <p className="text-sm font-semibold font-mono text-white">{formatDate(tenant.lease_end)}</p>
                  </div>
                  <div>
                    <p className="label mb-1">Duration</p>
                    <p className="text-sm font-semibold font-mono text-white">{getLeaseDuration(tenant.lease_start, tenant.lease_end)}</p>
                  </div>
                  <div>
                    <p className="label mb-1">Days Remaining</p>
                    <p className={cn(
                      'text-sm font-semibold font-mono',
                      daysRemaining !== null && daysRemaining > 90
                        ? 'text-green'
                        : daysRemaining !== null && daysRemaining > 30
                          ? 'text-gold'
                          : 'text-red',
                    )}>
                      {daysRemaining !== null ? (daysRemaining > 0 ? daysRemaining : 'Expired') : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Visual timeline bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-muted mb-2">
                    <span>{formatDate(tenant.lease_start)}</span>
                    <span className="text-gold font-medium">
                      {leaseProgress}% elapsed
                    </span>
                    <span>{formatDate(tenant.lease_end)}</span>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        leaseProgress >= 90
                          ? 'bg-red'
                          : leaseProgress >= 70
                            ? 'bg-gold'
                            : 'bg-green',
                      )}
                      style={{ width: `${Math.min(leaseProgress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Financial details */}
            <div className="grid grid-cols-2 gap-6">
              <Card
                className="rounded-lg"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                header={
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gold" />
                    <span className="label">Financial Terms</span>
                  </div>
                }
              >
                <div className="space-y-4">
                  <InfoRow label="Monthly Rent" value={
                    <span className="text-gold font-bold font-mono">{formatCurrency(tenant.monthly_rent)}</span>
                  } />
                  <InfoRow label="Security Deposit" value={formatCurrency(tenant.security_deposit || 0)} />
                  <InfoRow label="Deposit Held" value={formatCurrency(extendedData.depositHeld)} />
                  <InfoRow label="Late Fee" value={formatCurrency(extendedData.lateFeeAmount)} />
                  <InfoRow label="Grace Period" value={`${extendedData.graceDays} days`} />
                  <InfoRow label="Payment Method" value={extendedData.paymentMethod} />
                  <div className="pt-2 border-t border-border">
                    <InfoRow label="Annual Rent" value={
                      <span className="font-bold text-white">{formatCurrency(tenant.monthly_rent * 12)}</span>
                    } />
                  </div>
                </div>
              </Card>

              {/* Lease document + actions */}
              <Card
                className="rounded-lg"
                style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                header={
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gold" />
                    <span className="label">Lease Document & Actions</span>
                  </div>
                }
              >
                <div className="space-y-4">
                  {documents.find((d) => d.category === 'lease') ? (
                    <div className="flex items-center gap-3 p-3 bg-deep rounded-lg border border-border">
                      <FileText className="h-8 w-8 text-gold shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {documents.find((d) => d.category === 'lease')?.name}
                        </p>
                        <p className="text-xs text-muted">
                          Uploaded {formatDate(documents.find((d) => d.category === 'lease')?.created_at || null)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-border text-center">
                      <FileText className="h-6 w-6 text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted">No lease document uploaded yet.</p>
                    </div>
                  )}

                  {/* Renewal status */}
                  <div className="p-3 bg-deep rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted">Renewal Status</span>
                      <Badge variant={renewalBadgeMap[renewalStatus].variant} size="sm">
                        {renewalBadgeMap[renewalStatus].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {renewalStatus === 'renewal_due'
                        ? 'Lease expires within 60 days. Consider initiating renewal conversation.'
                        : renewalStatus === 'expired'
                          ? 'Lease has expired. Immediate action required.'
                          : renewalStatus === 'approaching'
                            ? 'Lease renewal window approaching. Plan ahead.'
                            : 'Lease is current. No action needed.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
                      Renew Lease
                    </Button>
                    <Button variant="danger" size="sm" icon={<XCircle className="w-3.5 h-3.5" />}>
                      End Lease
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 3: Payments                                            */}
        {/* ========================================================== */}
        <TabsContent value="payments">
          <div className="space-y-6">
            {/* Payment summary row */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <p className="label mb-1">Total Paid</p>
                <p className="text-lg font-bold font-mono text-green">{formatCurrency(totalPaid)}</p>
              </Card>
              <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <p className="label mb-1">Total Due</p>
                <p className="text-lg font-bold font-mono text-white">{formatCurrency(totalDue)}</p>
              </Card>
              <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <p className="label mb-1">Outstanding</p>
                <p className={cn('text-lg font-bold font-mono', outstandingBalance > 0 ? 'text-red' : 'text-green')}>
                  {formatCurrency(outstandingBalance)}
                </p>
              </Card>
              <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <p className="label mb-1">Late Fees</p>
                <p className={cn('text-lg font-bold font-mono', totalLateFees > 0 ? 'text-red' : 'text-muted')}>
                  {formatCurrency(totalLateFees)}
                </p>
              </Card>
              <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <p className="label mb-1">On-Time Rate</p>
                <p className={cn(
                  'text-lg font-bold font-mono',
                  onTimeRate >= 90 ? 'text-green' : onTimeRate >= 70 ? 'text-gold' : 'text-red',
                )}>
                  {onTimeRate}%
                </p>
              </Card>
            </div>

            {/* Late payment alert */}
            {latePayments.length > 0 && (
              <div className="flex items-center gap-4 rounded-xl border border-red/30 bg-red/5 px-5 py-3">
                <AlertTriangle className="h-5 w-5 text-red shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {latePayments.length} overdue payment{latePayments.length > 1 ? 's' : ''} totaling{' '}
                    <span className="text-red font-mono">{formatCurrency(latePayments.reduce((s, p) => s + p.amount_due, 0))}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setPaymentModalOpen(true)}
              >
                Log Manual Payment
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<LinkIcon className="w-3.5 h-3.5" />}
              >
                Generate Payment Link
              </Button>
            </div>

            {/* Payment history table */}
            {payments.length === 0 ? (
              <EmptyState
                icon={<DollarSign />}
                title="No payment records"
                description="Payment history will appear here once rent payments are logged."
              />
            ) : (
              <Card padding="none">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 label">Month</th>
                        <th className="text-left px-5 py-3 label">Due Date</th>
                        <th className="text-left px-5 py-3 label">Paid Date</th>
                        <th className="text-right px-5 py-3 label">Amount Due</th>
                        <th className="text-right px-5 py-3 label">Amount Paid</th>
                        <th className="text-right px-5 py-3 label">Late Fee</th>
                        <th className="text-center px-5 py-3 label">Status</th>
                        <th className="text-left px-5 py-3 label">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => {
                        const status = paymentStatusBadge(payment.status);
                        const dueDate = new Date(payment.due_date);
                        const monthLabel = dueDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                        // Determine row background for status
                        const rowBg =
                          payment.status === 'paid'
                            ? 'hover:bg-green/[0.03]'
                            : payment.status === 'late' || (payment.status === 'pending' && new Date(payment.due_date) < new Date())
                              ? 'bg-red/[0.02] hover:bg-red/[0.05]'
                              : payment.status === 'pending'
                                ? 'bg-gold/[0.02] hover:bg-gold/[0.04]'
                                : 'hover:bg-white/[0.02]';

                        return (
                          <tr key={payment.id} className={cn('border-b border-border/50 transition-colors', rowBg)}>
                            <td className="px-5 py-3 text-white font-mono font-medium">{monthLabel}</td>
                            <td className="px-5 py-3 text-white font-mono">{formatDate(payment.due_date)}</td>
                            <td className="px-5 py-3 text-white font-mono">{formatDate(payment.paid_date)}</td>
                            <td className="px-5 py-3 text-right text-white font-mono">{formatCurrency(payment.amount_due)}</td>
                            <td className="px-5 py-3 text-right text-white font-mono">
                              {payment.status === 'paid' || payment.status === 'partial'
                                ? formatCurrency(payment.amount_paid)
                                : '--'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {payment.late_fee_charged ? (
                                <span className="text-red font-medium font-mono">{formatCurrency(payment.late_fee_charged)}</span>
                              ) : (
                                <span className="text-muted font-mono">--</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={cn(
                                'font-mono text-[10px] px-2 py-0.5 rounded border',
                                status.variant === 'success' && 'bg-green/10 text-green border-green/20',
                                status.variant === 'danger' && 'bg-red/10 text-red border-red/20',
                                status.variant === 'warning' && 'bg-gold/10 text-gold border-gold/20',
                                status.variant === 'default' && 'bg-muted/10 text-muted border-muted/20',
                              )}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-muted font-mono capitalize">
                              {payment.payment_method?.replace('_', ' ') || '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Payment totals footer */}
                    <tfoot>
                      <tr className="border-t-2 border-border bg-card/50">
                        <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-white">Totals</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold font-mono text-white">{formatCurrency(totalDue)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold font-mono text-green">{formatCurrency(totalPaid)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold font-mono text-red">
                          {totalLateFees > 0 ? formatCurrency(totalLateFees) : '--'}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* Manual payment modal */}
          <Modal open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
            <ModalContent maxWidth="sm">
              <ModalHeader
                title="Log Manual Payment"
                description="Record a rent payment received from this tenant."
              />
              <div className="px-6 py-4 space-y-4">
                <Input
                  label="Amount"
                  type="number"
                  placeholder="0.00"
                  value={manualPayment.amount}
                  onChange={(e) => setManualPayment((p) => ({ ...p, amount: e.target.value }))}
                />
                <Input
                  label="Date Received"
                  type="date"
                  value={manualPayment.date}
                  onChange={(e) => setManualPayment((p) => ({ ...p, date: e.target.value }))}
                />
                <Select
                  label="Payment Method"
                  value={manualPayment.method}
                  onChange={(e) => setManualPayment((p) => ({ ...p, method: e.target.value }))}
                  options={[
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'check', label: 'Check' },
                    { value: 'cash', label: 'Cash' },
                    { value: 'online', label: 'Online' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>
              <ModalFooter>
                <Button variant="ghost" size="sm" onClick={() => setPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleLogPayment}>
                  Log Payment
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 4: Communication                                       */}
        {/* ========================================================== */}
        <TabsContent value="communication">
          <div className="space-y-6">
            {/* Communication summary */}
            {agentLogs.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">Total Interactions</p>
                  <p className="text-lg font-bold font-mono text-white">{agentLogs.length}</p>
                </Card>
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">Emails</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {agentLogs.filter((l) => l.action?.toLowerCase().includes('email')).length}
                  </p>
                </Card>
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">Calls</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {agentLogs.filter((l) => l.action?.toLowerCase().includes('call') || l.action?.toLowerCase().includes('voice')).length}
                  </p>
                </Card>
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">SMS</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {agentLogs.filter((l) => l.action?.toLowerCase().includes('sms')).length}
                  </p>
                </Card>
              </div>
            )}

            {/* Communication log */}
            {agentLogs.length === 0 ? (
              <EmptyState
                icon={<MessageSquare />}
                title="No communications yet"
                description="AI agent interactions with this tenant will be logged here, including emails, calls, and messages."
              />
            ) : (
              <div className="space-y-4">
                {agentLogs.map((log) => {
                  const agentIcon = log.agent_type === 'tenant_screener'
                    ? <Shield className="h-4 w-4" />
                    : log.agent_type === 'assistant'
                      ? <Bot className="h-4 w-4" />
                      : <Mail className="h-4 w-4" />;

                  const isVoice = log.action?.toLowerCase().includes('call') || log.action?.toLowerCase().includes('voice');
                  const isSms = log.action?.toLowerCase().includes('sms');
                  const isEmail = log.action?.toLowerCase().includes('email');

                  const output = log.output as Record<string, unknown> | null;
                  const subject = output?.subject as string | undefined;
                  const body = output?.body as string | undefined;
                  const transcript = output?.transcript as string | undefined;
                  const duration = output?.duration as string | undefined;
                  const message = output?.message as string | undefined;
                  const response = output?.response as string | undefined;

                  const channelLabel = isVoice ? 'Voice Call' : isSms ? 'SMS' : isEmail ? 'Email' : 'Agent Action';
                  const channelColor = isVoice ? 'bg-green/10 text-green' : isSms ? 'bg-gold/10 text-gold' : isEmail ? 'bg-red/10 text-red' : 'bg-muted/10 text-muted';

                  return (
                    <Card key={log.id} className="flex gap-4">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                        channelColor,
                      )}>
                        {isVoice ? <PhoneCall className="h-4 w-4" /> : isSms ? <MessageSquare className="h-4 w-4" /> : agentIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">
                            {channelLabel}
                          </span>
                          <span className="text-xs text-muted">
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                          <Badge variant={log.status === 'success' ? 'success' : log.status === 'error' ? 'danger' : 'warning'} size="sm">
                            {log.status}
                          </Badge>
                          {log.duration_ms && (
                            <span className="text-xs text-muted">{(log.duration_ms / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                        <p className="text-xs text-muted mb-2">{formatDateTime(log.created_at)}</p>

                        {isEmail && (
                          <div className="space-y-1">
                            {subject && <p className="text-sm text-white font-medium">Subject: {subject}</p>}
                            {body && <p className="text-sm text-muted line-clamp-3">{body}</p>}
                          </div>
                        )}

                        {isVoice && (
                          <div className="space-y-2">
                            {duration && <p className="text-xs text-muted">Duration: {duration}</p>}
                            <button className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-light transition-colors">
                              <Play className="h-3.5 w-3.5" />
                              Play Recording
                            </button>
                            {transcript && (
                              <div className="mt-2 p-3 bg-deep rounded-lg border border-border">
                                <p className="text-xs text-muted mb-1 font-medium">Transcript</p>
                                <p className="text-sm text-white whitespace-pre-wrap">{transcript}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {isSms && (
                          <div className="space-y-1">
                            {message && <p className="text-sm text-white">{message}</p>}
                            {response && (
                              <p className="text-sm text-muted">
                                <span className="text-gold">Response:</span> {response}
                              </p>
                            )}
                          </div>
                        )}

                        {!isEmail && !isVoice && !isSms && output && (
                          <p className="text-sm text-muted line-clamp-3">
                            {JSON.stringify(output).slice(0, 200)}
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 5: Maintenance                                         */}
        {/* ========================================================== */}
        <TabsContent value="maintenance">
          <div className="space-y-6">
            {/* Maintenance summary */}
            {maintenanceRequests.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">Total Requests</p>
                  <p className="text-lg font-bold font-mono text-white">{maintenanceRequests.length}</p>
                </Card>
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">Open</p>
                  <p className="text-lg font-bold font-mono text-red">
                    {maintenanceRequests.filter((r) => r.status === 'open' || r.status === 'in_progress').length}
                  </p>
                </Card>
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">Completed</p>
                  <p className="text-lg font-bold font-mono text-green">
                    {maintenanceRequests.filter((r) => r.status === 'completed').length}
                  </p>
                </Card>
                <Card className="text-center rounded-lg" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                  <p className="label mb-1">Total Cost</p>
                  <p className="text-lg font-bold font-mono text-gold">
                    {formatCurrency(maintenanceRequests.reduce((s, r) => s + (r.actual_cost || r.estimated_cost || 0), 0))}
                  </p>
                </Card>
              </div>
            )}

            {maintenanceRequests.length === 0 ? (
              <EmptyState
                icon={<Wrench />}
                title="No maintenance requests"
                description="Maintenance requests for this tenant's property will appear here."
              />
            ) : (
              <div className="space-y-4">
                {maintenanceRequests.map((req) => {
                  const statusConf = maintenanceStatusConfig[req.status] || { label: req.status, color: 'text-muted' };
                  const priorityConf = maintenancePriorityConfig[req.priority] || { label: req.priority, variant: 'default' as const };

                  return (
                    <Card key={req.id}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-white">{req.title}</h4>
                            <Badge variant={priorityConf.variant} size="sm">{priorityConf.label}</Badge>
                          </div>
                          <p className="text-xs text-muted">{req.description}</p>
                        </div>
                        <Badge
                          variant={
                            req.status === 'completed' ? 'success'
                              : req.status === 'open' || req.status === 'in_progress' ? 'warning'
                                : 'default'
                          }
                          size="sm"
                          dot
                        >
                          {statusConf.label}
                        </Badge>
                      </div>

                      {/* Category */}
                      <div className="mb-3">
                        <Badge variant="default" size="sm">{req.category.replace(/_/g, ' ')}</Badge>
                      </div>

                      {/* Timeline dots */}
                      <div className="flex items-center gap-6 text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Submitted {formatDate(req.created_at)}
                        </div>
                        {req.scheduled_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Scheduled {formatDate(req.scheduled_date)}
                          </div>
                        )}
                        {req.completed_date && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green" />
                            Completed {formatDate(req.completed_date)}
                          </div>
                        )}
                      </div>

                      {/* Costs */}
                      {(req.estimated_cost || req.actual_cost) && (
                        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border text-xs">
                          {req.estimated_cost && (
                            <span className="text-muted">Est. Cost: <span className="text-white font-medium font-mono">{formatCurrency(req.estimated_cost)}</span></span>
                          )}
                          {req.actual_cost && (
                            <span className="text-muted">Actual Cost: <span className="text-white font-medium font-mono">{formatCurrency(req.actual_cost)}</span></span>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 6: Documents                                           */}
        {/* ========================================================== */}
        <TabsContent value="documents">
          <div className="space-y-6">
            {/* Upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed border-border rounded-xl p-8',
                'flex flex-col items-center justify-center text-center',
                'cursor-pointer transition-all duration-200',
                'hover:border-gold/40 hover:bg-gold/[0.02]',
              )}
            >
              <Upload className="h-8 w-8 text-muted mb-3" />
              <p className="text-sm font-medium text-white mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted">
                PDF, DOC, JPG, PNG up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
              />
            </div>

            {/* Document summary */}
            {documents.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted">
                <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
                <span className="text-border">|</span>
                <span>
                  {(documents.reduce((s, d) => s + d.file_size, 0) / 1024 / 1024).toFixed(1)} MB total
                </span>
              </div>
            )}

            {/* Document cards */}
            {documents.length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No documents uploaded"
                description="Upload lease agreements, ID copies, screening reports, and other tenant documents."
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {documents.map((doc) => {
                  const categoryLabels: Record<string, string> = {
                    lease: 'Lease Agreement',
                    inspection: 'Inspection Report',
                    insurance: 'Insurance',
                    tax: 'Tax Document',
                    receipt: 'Receipt',
                    contract: 'Contract',
                    photo: 'Photo',
                    report: 'Screening Report',
                    other: 'Other',
                  };

                  const categoryColors: Record<string, string> = {
                    lease: 'bg-gold/10 text-gold',
                    inspection: 'bg-green/10 text-green',
                    insurance: 'bg-muted/10 text-muted',
                    tax: 'bg-red/10 text-red',
                    receipt: 'bg-green/10 text-green',
                    contract: 'bg-gold/10 text-gold',
                    photo: 'bg-muted/10 text-muted',
                    report: 'bg-gold/10 text-gold',
                    other: 'bg-muted/10 text-muted',
                  };

                  const fileSizeLabel = doc.file_size < 1024
                    ? `${doc.file_size} B`
                    : doc.file_size < 1024 * 1024
                      ? `${(doc.file_size / 1024).toFixed(0)} KB`
                      : `${(doc.file_size / 1024 / 1024).toFixed(1)} MB`;

                  return (
                    <Card key={doc.id} className="flex items-center gap-4">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl shrink-0',
                        categoryColors[doc.category] || 'bg-muted/10 text-muted',
                      )}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="default" size="sm">
                            {categoryLabels[doc.category] || doc.category}
                          </Badge>
                          <span className="text-xs text-muted">{fileSizeLabel}</span>
                          <span className="text-xs text-muted">{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                        <a
                          href={doc.file_url}
                          download
                          className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
