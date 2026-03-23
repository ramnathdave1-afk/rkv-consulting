'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import LeaseFormModal from '@/components/leases/LeaseFormModal';
import type { LeaseFormData } from '@/components/leases/LeaseFormModal';
import type { LeaseStatus } from '@/lib/types';
import { FileText, Plus, Pencil, Trash2, Search } from 'lucide-react';

interface LeaseRow {
  id: string;
  unit_id: string;
  tenant_id: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number | null;
  status: LeaseStatus;
  units: { unit_number: string; property_id: string; properties: { name: string } | null } | null;
  tenants: { first_name: string; last_name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  active: 'bg-green-500/10 text-green-500',
  expired: 'bg-gray-500/10 text-gray-400',
  terminated: 'bg-red-500/10 text-red-500',
  renewed: 'bg-blue-500/10 text-blue-500',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'renewed', label: 'Renewed' },
];

export default function LeasesPage() {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editLease, setEditLease] = useState<LeaseFormData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchLeases = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    let query = supabase
      .from('leases')
      .select('id, unit_id, tenant_id, lease_start, lease_end, monthly_rent, security_deposit, status, units(unit_number, property_id, properties(name)), tenants(first_name, last_name)')
      .eq('org_id', profile.org_id)
      .order('lease_end', { ascending: true });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    setLeases((data as LeaseRow[]) || []);
    setLoading(false);
  }, [supabase, statusFilter]);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  const filtered = leases.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const tenantName = l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}`.toLowerCase() : '';
    const propName = (l.units?.properties?.name || '').toLowerCase();
    const unitNum = (l.units?.unit_number || '').toLowerCase();
    return tenantName.includes(q) || propName.includes(q) || unitNum.includes(q);
  });

  const handleAdd = () => {
    setEditLease(null);
    setModalOpen(true);
  };

  const handleEdit = (l: LeaseRow) => {
    setEditLease({
      id: l.id,
      property_id: l.units?.property_id || '',
      unit_id: l.unit_id,
      tenant_id: l.tenant_id,
      lease_start: l.lease_start,
      lease_end: l.lease_end,
      monthly_rent: String(l.monthly_rent),
      security_deposit: l.security_deposit != null ? String(l.security_deposit) : '',
      status: l.status,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lease? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/leases/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to delete');
      }
      toast.success('Lease deleted');
      fetchLeases();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '--';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Leases</h1>
          <p className="text-sm text-text-secondary">{filtered.length} lease{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={handleAdd}>
          New Lease
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search tenant, property, or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-48">
          <SelectField
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FileText size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {leases.length === 0 ? 'No leases yet' : 'No matching leases'}
          </h3>
          <p className="text-sm text-text-secondary">
            {leases.length === 0
              ? 'Create a lease after adding properties, units, and tenants.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Tenant</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Property / Unit</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Monthly Rent</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Lease Start</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Lease End</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '--'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <span className="text-text-primary">{l.units?.properties?.name || '--'}</span>
                      <span className="text-text-muted mx-1">/</span>
                      <span>{l.units?.unit_number || '--'}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono">
                      ${Number(l.monthly_rent).toLocaleString()}<span className="text-text-muted">/mo</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(l.lease_start)}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(l.lease_end)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusColors[l.status] || ''}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(l)}
                          className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                          title="Edit lease"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          disabled={deletingId === l.id}
                          className="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete lease"
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
        </div>
      )}

      {/* Modal */}
      <LeaseFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editLease={editLease}
        onSuccess={fetchLeases}
      />
    </div>
  );
}
