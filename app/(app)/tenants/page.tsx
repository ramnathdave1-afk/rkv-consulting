'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable, StatusBadge } from '@/components/ui/AnimatedTable';
import type { TableColumn, RowStatus } from '@/components/ui/AnimatedTable';
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

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await fetch('/api/tenants/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load tenants');
      setTenants((json.items as Tenant[]) || []);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTenants.slice(start, start + pageSize);
  }, [filteredTenants, page, pageSize]);

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

  const mapTenantStatus = (status: string): RowStatus => {
    switch (status) {
      case 'active': case 'approved': return 'active';
      case 'prospect': case 'applicant': return 'info';
      case 'notice': return 'warning';
      case 'past': return 'inactive';
      case 'denied': return 'critical';
      default: return 'default';
    }
  };

  // Row # = 1 col, remaining columns must sum to 11
  const tenantColumns: TableColumn<Tenant>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name',
      span: 3,
      render: (row) => (
        <span className="text-[13px] font-medium text-white/90 truncate block">{row.first_name} {row.last_name}</span>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      span: 3,
      render: (row) => (
        <span className="text-[13px] text-white/50 truncate block">{row.email || '\u2014'}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      span: 2,
      render: (row) => (
        <span className="text-[13px] text-white/50 truncate block">{row.phone || '\u2014'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      span: 1,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 2,
      align: 'right',
      isAction: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded-md text-white/30 hover:text-accent hover:bg-accent/10 transition-colors"
            title="Edit tenant"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete tenant"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], []);

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
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 sm:max-w-sm">
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-full sm:w-48">
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
        <>
          <AnimatedTable<Tenant>
            columns={tenantColumns}
            data={paginated}
            getKey={(row) => row.id}
            getRowNumber={(_, i) => String((page - 1) * pageSize + i + 1).padStart(2, '0')}
            getRowStatus={(row) => mapTenantStatus(row.status)}
            title="Tenants"
            subtitle={`${filteredTenants.length} tenant${filteredTenants.length !== 1 ? 's' : ''}`}
            headerRight={
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                <Plus size={16} />
                Add Tenant
              </button>
            }
            emptyState={
              <p className="text-sm text-white/40">No tenants found.</p>
            }
          />
          <Pagination
            total={filteredTenants.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </>
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
