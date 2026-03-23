'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Users, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { TenantFormModal } from '@/components/tenants/TenantFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, SelectField } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import type { Tenant, TenantStatus } from '@/lib/types';

const statusColors: Record<string, string> = {
  prospect: 'bg-blue-500/10 text-blue-500',
  applicant: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  active: 'bg-green-500/10 text-green-500',
  notice: 'bg-orange-500/10 text-orange-500',
  past: 'bg-gray-500/10 text-gray-500',
  denied: 'bg-red-500/10 text-red-500',
};

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'applicant', label: 'Applicant' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'notice', label: 'Notice' },
  { value: 'past', label: 'Past' },
  { value: 'denied', label: 'Denied' },
];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const supabase = createClient();

  const fetchTenants = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    setTenants((data as Tenant[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = useMemo(() => {
    let result = tenants;

    if (statusFilter) {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
        const email = (t.email || '').toLowerCase();
        const phone = (t.phone || '').toLowerCase();
        return fullName.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    return result;
  }, [tenants, search, statusFilter]);

  function handleAdd() {
    setEditingTenant(null);
    setModalOpen(true);
  }

  function handleEdit(tenant: Tenant) {
    setEditingTenant(tenant);
    setModalOpen(true);
  }

  function handleDeleteClick(tenant: Tenant) {
    setDeletingTenant(tenant);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingTenant) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/tenants/${deletingTenant.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete tenant');
      }
      toast.success(`${deletingTenant.first_name} ${deletingTenant.last_name} deleted`);
      fetchTenants();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
      setDeletingTenant(null);
    }
  }

  function handleModalSuccess() {
    fetchTenants();
  }

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
          <h1 className="font-display text-xl font-bold text-text-primary">Tenants</h1>
          <p className="text-sm text-text-secondary">{tenants.length} tenants & prospects</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-48">
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {/* Table / Empty state */}
      {filteredTenants.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Users size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {tenants.length === 0 ? 'No tenants yet' : 'No matching tenants'}
          </h3>
          <p className="text-sm text-text-secondary">
            {tenants.length === 0
              ? 'Add tenants manually or sync from your PM platform.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Phone</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Source</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{t.first_name} {t.last_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.email || '\u2014'}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.phone || '\u2014'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[t.status] || ''}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{t.source || '\u2014'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(t)}
                        className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                        title="Edit tenant"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(t)}
                        className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger-muted transition-colors"
                        title="Delete tenant"
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
      )}

      {/* Add/Edit Modal */}
      <TenantFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tenant={editingTenant}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Tenant"
        description={
          deletingTenant
            ? `Are you sure you want to delete ${deletingTenant.first_name} ${deletingTenant.last_name}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  );
}
