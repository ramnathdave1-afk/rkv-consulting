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
  Car,
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
    late: { label: 'Late', variant: 'danger' },
    pending: { label: 'Pending', variant: 'warning' },
    partial: { label: 'Partial', variant: 'default' },
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

    // Maintenance
    const { data: maintenanceData } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    setMaintenanceRequests(maintenanceData || []);

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
      amount: parseFloat(manualPayment.amount),
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
        <div className="h-8 w-64 bg-border/50 rounded animate-pulse" />
        <div className="h-12 w-full bg-border/50 rounded-xl animate-pulse" />
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
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalDue = payments.reduce((s, p) => s + p.amount, 0);
  const outstandingBalance = totalDue - totalPaid;
  const onTimePaid = payments.filter((p) => p.status === 'paid' && p.paid_date && p.paid_date <= p.due_date).length;
  const onTimeRate = payments.length > 0 ? Math.round((onTimePaid / payments.length) * 100) : 100;

  // Mock extended tenant data (would come from a tenant_details table in production)
  const extendedData = {
    dob: '1988-05-14',
    emergencyContact: { name: 'Sarah Johnson', phone: '(555) 123-4567', relation: 'Sister' },
    vehicle: { make: 'Toyota', model: 'Camry', plate: 'ABC-1234' },
    rentersInsurance: true,
    lateFeeAmount: 50,
    graceDays: 5,
    paymentMethod: 'Bank Transfer (ACH)',
    depositHeld: tenant.security_deposit || 0,
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
              <Badge variant={statusBadge.variant} dot>
                {statusBadge.label}
              </Badge>
            </div>
            <p className="text-sm text-muted mt-0.5">
              {property
                ? `${property.address}, ${property.city}, ${property.state} ${property.zip}`
                : 'No property assigned'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />}>
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
            {/* Personal Info */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Personal Information</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Full Name</span>
                  <span className="text-sm text-white font-medium">{tenant.first_name} {tenant.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Email</span>
                  <span className="text-sm text-white font-medium">{tenant.email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Phone</span>
                  <span className="text-sm text-white font-medium">{tenant.phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Date of Birth</span>
                  <span className="text-sm text-white font-medium">{formatDate(extendedData.dob)}</span>
                </div>
              </div>
            </Card>

            {/* Emergency Contact */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Emergency Contact</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Name</span>
                  <span className="text-sm text-white font-medium">{extendedData.emergencyContact.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Phone</span>
                  <span className="text-sm text-white font-medium">{extendedData.emergencyContact.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Relation</span>
                  <span className="text-sm text-white font-medium">{extendedData.emergencyContact.relation}</span>
                </div>
              </div>
            </Card>

            {/* Vehicle Info */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Vehicle Information</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Make</span>
                  <span className="text-sm text-white font-medium">{extendedData.vehicle.make}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Model</span>
                  <span className="text-sm text-white font-medium">{extendedData.vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">License Plate</span>
                  <span className="text-sm text-white font-medium">{extendedData.vehicle.plate}</span>
                </div>
              </div>
            </Card>

            {/* Renters Insurance */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Renters Insurance</span>
                </div>
              }
            >
              <div className="flex items-center gap-3">
                {extendedData.rentersInsurance ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green/10">
                      <CheckCircle className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green">Verified</p>
                      <p className="text-xs text-muted">Insurance on file and current</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red/10">
                      <XCircle className="h-5 w-5 text-red" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red">Not Verified</p>
                      <p className="text-xs text-muted">Requires verification - contact tenant</p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 2: Lease                                               */}
        {/* ========================================================== */}
        <TabsContent value="lease">
          <div className="space-y-6">
            {/* Lease Dates */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gold" />
                  <span className="font-display font-semibold text-sm text-white">Lease Timeline</span>
                </div>
              }
            >
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted mb-1">Start Date</p>
                    <p className="text-sm font-semibold text-white">{formatDate(tenant.lease_start)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">End Date</p>
                    <p className="text-sm font-semibold text-white">{formatDate(tenant.lease_end)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Duration</p>
                    <p className="text-sm font-semibold text-white">{getLeaseDuration(tenant.lease_start, tenant.lease_end)}</p>
                  </div>
                </div>

                {/* Visual timeline bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-muted mb-2">
                    <span>{formatDate(tenant.lease_start)}</span>
                    <span className="text-gold font-medium">
                      {daysRemaining !== null && daysRemaining > 0
                        ? `${daysRemaining} days remaining`
                        : daysRemaining !== null && daysRemaining <= 0
                          ? 'Lease expired'
                          : 'No end date'}
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
                header={
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gold" />
                    <span className="font-display font-semibold text-sm text-white">Financial Terms</span>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Monthly Rent</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(tenant.monthly_rent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Security Deposit</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(tenant.security_deposit || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Deposit Held</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(extendedData.depositHeld)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Late Fee</span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(extendedData.lateFeeAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Grace Period</span>
                    <span className="text-sm font-semibold text-white">{extendedData.graceDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Payment Method</span>
                    <span className="text-sm font-semibold text-white">{extendedData.paymentMethod}</span>
                  </div>
                </div>
              </Card>

              {/* Lease document + actions */}
              <Card
                header={
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gold" />
                    <span className="font-display font-semibold text-sm text-white">Lease Document</span>
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
                    <p className="text-sm text-muted">No lease document uploaded yet.</p>
                  )}

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
            <div className="grid grid-cols-4 gap-4">
              <Card className="text-center">
                <p className="text-xs text-muted mb-1">Total Paid</p>
                <p className="text-lg font-bold text-green">{formatCurrency(totalPaid)}</p>
              </Card>
              <Card className="text-center">
                <p className="text-xs text-muted mb-1">Total Due</p>
                <p className="text-lg font-bold text-white">{formatCurrency(totalDue)}</p>
              </Card>
              <Card className="text-center">
                <p className="text-xs text-muted mb-1">Outstanding</p>
                <p className={cn('text-lg font-bold', outstandingBalance > 0 ? 'text-red' : 'text-green')}>
                  {formatCurrency(outstandingBalance)}
                </p>
              </Card>
              <Card className="text-center">
                <p className="text-xs text-muted mb-1">On-Time Rate</p>
                <p className="text-lg font-bold text-gold">{onTimeRate}%</p>
              </Card>
            </div>

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
                variant="secondary"
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
                        <th className="text-left px-5 py-3 text-xs text-muted font-medium">Date Due</th>
                        <th className="text-left px-5 py-3 text-xs text-muted font-medium">Date Paid</th>
                        <th className="text-right px-5 py-3 text-xs text-muted font-medium">Amount Due</th>
                        <th className="text-right px-5 py-3 text-xs text-muted font-medium">Amount Paid</th>
                        <th className="text-right px-5 py-3 text-xs text-muted font-medium">Late Fee</th>
                        <th className="text-center px-5 py-3 text-xs text-muted font-medium">Status</th>
                        <th className="text-left px-5 py-3 text-xs text-muted font-medium">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => {
                        const status = paymentStatusBadge(payment.status);
                        return (
                          <tr key={payment.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3 text-white">{formatDate(payment.due_date)}</td>
                            <td className="px-5 py-3 text-white">{formatDate(payment.paid_date)}</td>
                            <td className="px-5 py-3 text-right text-white">{formatCurrency(payment.amount)}</td>
                            <td className="px-5 py-3 text-right text-white">
                              {payment.status === 'paid' || payment.status === 'partial'
                                ? formatCurrency(payment.amount)
                                : '--'}
                            </td>
                            <td className="px-5 py-3 text-right text-white">
                              {payment.late_fee ? formatCurrency(payment.late_fee) : '--'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <Badge variant={status.variant} size="sm">{status.label}</Badge>
                            </td>
                            <td className="px-5 py-3 text-muted capitalize">
                              {payment.payment_method?.replace('_', ' ') || '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
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

                return (
                  <Card key={log.id} className="flex gap-4">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                      isVoice ? 'bg-green/10 text-green'
                        : isSms ? 'bg-gold/10 text-gold'
                          : isEmail ? 'bg-red/10 text-red'
                            : 'bg-muted/10 text-muted',
                    )}>
                      {isVoice ? <PhoneCall className="h-4 w-4" /> : isSms ? <MessageSquare className="h-4 w-4" /> : agentIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white capitalize">
                          {log.action?.replace(/_/g, ' ') || log.agent_type.replace(/_/g, ' ')}
                        </span>
                        <Badge variant={log.status === 'success' ? 'success' : log.status === 'error' ? 'danger' : 'warning'} size="sm">
                          {log.status}
                        </Badge>
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
        </TabsContent>

        {/* ========================================================== */}
        {/*  TAB 5: Maintenance                                         */}
        {/* ========================================================== */}
        <TabsContent value="maintenance">
          {maintenanceRequests.length === 0 ? (
            <EmptyState
              icon={<Wrench />}
              title="No maintenance requests"
              description="Maintenance requests submitted by this tenant will appear here."
            />
          ) : (
            <div className="space-y-4">
              {maintenanceRequests.map((req) => {
                const statusConf = maintenanceStatusConfig[req.status] || { label: req.status, color: 'text-muted' };

                return (
                  <Card key={req.id}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{req.title}</h4>
                        <p className="text-xs text-muted mt-0.5">{req.description}</p>
                      </div>
                      <Badge
                        variant={
                          req.status === 'completed' ? 'success'
                            : req.status === 'open' || req.status === 'in_progress' ? 'warning'
                              : 'default'
                        }
                        size="sm"
                      >
                        {statusConf.label}
                      </Badge>
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
                          <span className="text-muted">Est. Cost: <span className="text-white font-medium">{formatCurrency(req.estimated_cost)}</span></span>
                        )}
                        {req.actual_cost && (
                          <span className="text-muted">Actual Cost: <span className="text-white font-medium">{formatCurrency(req.actual_cost)}</span></span>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
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

                  return (
                    <Card key={doc.id} className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 shrink-0">
                        <FileText className="h-6 w-6 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="default" size="sm">
                            {categoryLabels[doc.category] || doc.category}
                          </Badge>
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
