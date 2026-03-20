'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Home, FileText, Wrench, DollarSign, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface TenantDashboardData {
  tenant: { first_name: string; last_name: string; status: string } | null;
  lease: { monthly_rent: number; lease_start: string; lease_end: string; status: string; units: { unit_number: string; properties: { name: string; address_line1: string } | null } | null } | null;
  workOrders: { id: string; title: string; status: string; priority: string; created_at: string }[];
  payments: { id: string; amount: number; category: string; transaction_date: string }[];
}

export default function TenantPortalPage() {
  const [data, setData] = useState<TenantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceText, setMaintenanceText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      // For tenant portal, find the tenant record linked to this user's email
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, status, email')
        .eq('org_id', profile.org_id)
        .eq('email', user.email)
        .single();

      if (!tenant) {
        setData({ tenant: null, lease: null, workOrders: [], payments: [] });
        setLoading(false);
        return;
      }

      const [leaseRes, woRes, payRes] = await Promise.all([
        supabase.from('leases')
          .select('monthly_rent, lease_start, lease_end, status, units(unit_number, properties(name, address_line1))')
          .eq('tenant_id', tenant.id).eq('status', 'active').limit(1).single(),
        supabase.from('work_orders')
          .select('id, title, status, priority, created_at')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false }).limit(10),
        supabase.from('financial_transactions')
          .select('id, amount, category, transaction_date')
          .eq('tenant_id', tenant.id).eq('type', 'income')
          .order('transaction_date', { ascending: false }).limit(10),
      ]);

      setData({
        tenant: { first_name: tenant.first_name, last_name: tenant.last_name, status: tenant.status },
        lease: leaseRes.data as TenantDashboardData['lease'],
        workOrders: (woRes.data || []) as TenantDashboardData['workOrders'],
        payments: (payRes.data || []) as TenantDashboardData['payments'],
      });
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  async function submitMaintenanceRequest() {
    if (!maintenanceText.trim() || submitting) return;
    setSubmitting(true);

    // Use the existing work order creation via AI triage
    const res = await fetch('/api/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: maintenanceText.slice(0, 80),
        description: maintenanceText,
        source: 'tenant_portal',
        property_id: (data?.lease?.units as unknown as { properties: { id?: string } })?.properties?.id,
      }),
    });

    if (res.ok) {
      setSubmitted(true);
      setMaintenanceText('');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data?.tenant) {
    return (
      <div className="p-6">
        <div className="glass-card p-8 text-center">
          <Home size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Tenant Portal</h3>
          <p className="text-sm text-text-secondary">No tenant record found for your account. Contact your property manager.</p>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = data.lease ? Math.ceil((new Date(data.lease.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">
          Welcome, {data.tenant.first_name}
        </h1>
        <p className="text-sm text-text-secondary">Tenant Portal</p>
      </div>

      {/* Lease Info */}
      {data.lease && (
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Your Lease</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-text-muted uppercase">Property</p>
              <p className="text-sm font-medium text-text-primary">
                {(data.lease.units as unknown as { properties: { name: string } | null })?.properties?.name || '—'}
              </p>
              <p className="text-xs text-text-muted">
                Unit {(data.lease.units as unknown as { unit_number: string })?.unit_number}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Monthly Rent</p>
              <p className="text-sm font-medium text-text-primary">${Number(data.lease.monthly_rent).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Lease End</p>
              <p className="text-sm font-medium text-text-primary">{data.lease.lease_end}</p>
              {daysUntilExpiry !== null && daysUntilExpiry <= 90 && (
                <p className={`text-xs ${daysUntilExpiry <= 30 ? 'text-red-500' : 'text-yellow-500'}`}>{daysUntilExpiry} days remaining</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase">Status</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-500 capitalize">{data.lease.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Maintenance */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          <Wrench size={14} className="inline mr-1.5" />
          Submit Maintenance Request
        </h3>
        {submitted ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
            <p className="text-sm text-green-500 font-medium">Request submitted! We&apos;ll get back to you shortly.</p>
            <button onClick={() => setSubmitted(false)} className="text-xs text-accent mt-2 hover:underline">Submit Another</button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={maintenanceText}
              onChange={(e) => setMaintenanceText(e.target.value)}
              placeholder="Describe the issue (e.g., 'Kitchen faucet is leaking under the sink')"
              rows={3}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            />
            <button
              onClick={submitMaintenanceRequest}
              disabled={!maintenanceText.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50"
            >
              <Plus size={14} />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        )}
      </div>

      {/* Work Orders */}
      {data.workOrders.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Recent Maintenance Requests</h3>
          <div className="space-y-2">
            {data.workOrders.map((wo) => (
              <div key={wo.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm text-text-primary">{wo.title}</p>
                  <p className="text-[10px] text-text-muted">{new Date(wo.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                  wo.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                  wo.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-yellow-500/10 text-yellow-500'
                }`}>{wo.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {data.payments.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            <DollarSign size={14} className="inline mr-1.5" />
            Payment History
          </h3>
          <div className="space-y-2">
            {data.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-sm text-text-primary capitalize">{p.category.replace('_', ' ')}</p>
                  <p className="text-[10px] text-text-muted">{p.transaction_date}</p>
                </div>
                <p className="text-sm font-medium text-green-500">${Number(p.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
