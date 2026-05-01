'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable } from '@/components/ui/AnimatedTable';
import type { TableColumn, RowStatus } from '@/components/ui/AnimatedTable';
import { Users, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { TenantFormModal } from '@/components/tenants/TenantFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { Tenant } from '@/lib/types';

const statusBadgeClass: Record<string, string> = {
  prospect: 'bg-sky-50 text-sky-700 border border-sky-200',
  applicant: 'bg-amber-50 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  notice: 'bg-slate-100 text-slate-700 border border-slate-200',
  past: 'bg-slate-100 text-slate-700 border border-slate-200',
  denied: 'bg-red-50 text-red-700 border border-red-200',
  terminated: 'bg-red-50 text-red-700 border border-red-200',
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

function formatMoveDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(first: string, last: string) {
  return `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || '?';
}

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

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }
  function resetFilters() { setSearch(''); setStatusFilter(''); }

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

  const tenantColumns: TableColumn<Tenant>[] = useMemo(() => [
    {
      key: 'select',
      label: '',
      span: 1,
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => toggleSelect(row.id)}
            className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
          />
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Tenant',
      span: 3,
      render: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
            {getInitials(row.first_name, row.last_name)}
          </div>
          <span className="text-[13px] font-medium text-[#020617] truncate">{row.first_name} {row.last_name}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      span: 3,
      render: (row) => (
        <div className="min-w-0">
          <div className="text-[13px] text-[#020617] truncate">{row.email || '—'}</div>
          <div className="text-xs text-slate-500 truncate">{row.phone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      span: 1,
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadgeClass[row.status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'move_in',
      label: 'Move-in',
      span: 1,
      render: (row) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">{formatMoveDate(row.move_in_date)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      span: 2,
      align: 'right',
      isAction: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors"
            title="Edit tenant"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDeleteClick(row)}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete tenant"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [selectedIds]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Tenants</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tenants.length} total &middot; {filteredTenants.length} matching filters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Import CSV</Button>
          <Button icon={<Plus size={16} />} onClick={handleAdd}>
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg mb-4">
        <div className="flex-1">
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
        <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
      </div>

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-white border border-slate-200 rounded-lg p-3 mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">Update Status</Button>
            <Button variant="ghost" size="sm">Export</Button>
            <Button variant="danger" size="sm">Delete</Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
          </div>
        </div>
      )}

      {/* Table / Empty state */}
      {filteredTenants.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <Users size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="font-display text-lg font-semibold text-[#020617] mb-2">
            {tenants.length === 0 ? 'No tenants yet' : 'No matching tenants'}
          </h3>
          <p className="text-sm text-slate-500">
            {tenants.length === 0
              ? 'Add tenants manually or sync from your PM platform.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <AnimatedTable<Tenant>
            columns={tenantColumns}
            data={paginated}
            getKey={(row) => row.id}
            getRowStatus={(row) => mapTenantStatus(row.status)}
            emptyState={
              <p className="text-sm text-slate-500">No tenants found.</p>
            }
          />
          <Pagination
            total={filteredTenants.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
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
