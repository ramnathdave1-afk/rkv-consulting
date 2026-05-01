'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable } from '@/components/ui/AnimatedTable';
import type { TableColumn, RowStatus } from '@/components/ui/AnimatedTable';
import { toast } from '@/components/ui/Toast';
import LeaseFormModal from '@/components/leases/LeaseFormModal';
import type { LeaseFormData } from '@/components/leases/LeaseFormModal';
import { LocationFilter } from '@/components/settings/LocationFilter';
import { useLocations } from '@/lib/hooks/useLocations';
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
  location_id: string | null;
  units: { unit_number: string; property_id: string; properties: { name: string; location_id?: string | null } | null } | null;
  tenants: { first_name: string; last_name: string } | null;
}

const statusBadgeClass: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  expired: 'bg-slate-100 text-slate-700 border border-slate-200',
  terminated: 'bg-red-50 text-red-700 border border-red-200',
  renewed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchLeases = useCallback(async () => {
    try {
      const res = await fetch('/api/leases/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load leases');
      setLeases((json.items as LeaseRow[]) || []);
    } catch (err) {
      console.error('Failed to fetch leases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  const { activeLocationId } = useLocations();

  const filtered = useMemo(() => leases.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (activeLocationId) {
      const lLoc = l.location_id || l.units?.properties?.location_id || null;
      if (lLoc !== activeLocationId) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    const tenantName = l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}`.toLowerCase() : '';
    const propName = (l.units?.properties?.name || '').toLowerCase();
    const unitNum = (l.units?.unit_number || '').toLowerCase();
    return tenantName.includes(q) || propName.includes(q) || unitNum.includes(q);
  }), [leases, search, statusFilter, activeLocationId]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, activeLocationId]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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

  const formatDate = (d: string) => {
    if (!d) return '--';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const mapLeaseStatus = (status: string): RowStatus => {
    switch (status) {
      case 'active': case 'renewed': return 'active';
      case 'pending': return 'warning';
      case 'expired': return 'inactive';
      case 'terminated': return 'critical';
      default: return 'default';
    }
  };

  const leaseColumns: TableColumn<LeaseRow>[] = useMemo(() => [
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
      key: 'tenant_property',
      label: 'Tenant / Property',
      span: 4,
      render: (row) => (
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[#020617] truncate">
            {row.tenants ? `${row.tenants.first_name} ${row.tenants.last_name}` : '—'}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {row.units?.properties?.name || '—'} · Unit {row.units?.unit_number || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'rent',
      label: 'Rent',
      span: 2,
      align: 'right',
      render: (row) => (
        <span className="tabular-nums font-display font-semibold text-[#020617] text-[13px]">
          ${Number(row.monthly_rent).toLocaleString()}
          <span className="text-slate-400 font-normal">/mo</span>
        </span>
      ),
    },
    {
      key: 'dates',
      label: 'Term',
      span: 3,
      render: (row) => (
        <span className="text-xs text-slate-500 truncate block tabular-nums">
          {formatDate(row.lease_start)} – {formatDate(row.lease_end)}
        </span>
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
      key: 'actions',
      label: '',
      span: 1,
      align: 'right',
      isAction: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors"
            title="Edit lease"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deletingId === row.id}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete lease"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [deletingId, selectedIds]);

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
          <h1 className="font-display text-2xl font-bold text-[#020617]">Leases</h1>
          <p className="text-sm text-slate-500 mt-1">
            {leases.length} total &middot; {filtered.length} matching filters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Import CSV</Button>
          <Button icon={<Plus size={16} />} onClick={handleAdd}>
            New Lease
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search tenant, property, or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-full sm:w-48">
          <SelectField
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <LocationFilter />
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

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <FileText size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="font-display text-lg font-semibold text-[#020617] mb-2">
            {leases.length === 0 ? 'No leases yet' : 'No matching leases'}
          </h3>
          <p className="text-sm text-slate-500">
            {leases.length === 0
              ? 'Create a lease after adding properties, units, and tenants.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <AnimatedTable<LeaseRow>
            columns={leaseColumns}
            data={paginated}
            getKey={(row) => row.id}
            getRowStatus={(row) => mapLeaseStatus(row.status)}
            emptyState={
              <p className="text-sm text-slate-500">No leases found.</p>
            }
          />
          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
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
