'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable, StatusBadge } from '@/components/ui/AnimatedTable';
import type { TableColumn, RowStatus } from '@/components/ui/AnimatedTable';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const filtered = useMemo(() => leases.filter((l) => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const tenantName = l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}`.toLowerCase() : '';
    const propName = (l.units?.properties?.name || '').toLowerCase();
    const unitNum = (l.units?.unit_number || '').toLowerCase();
    return tenantName.includes(q) || propName.includes(q) || unitNum.includes(q);
  }), [leases, search, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

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

  // Row # = 1 col, remaining columns must sum to 11
  const leaseColumns: TableColumn<LeaseRow>[] = useMemo(() => [
    {
      key: 'tenant',
      label: 'Tenant',
      span: 2,
      render: (row) => (
        <span className="text-[13px] font-medium text-white/90 truncate block">
          {row.tenants ? `${row.tenants.first_name} ${row.tenants.last_name}` : '--'}
        </span>
      ),
    },
    {
      key: 'property_unit',
      label: 'Property / Unit',
      span: 3,
      render: (row) => (
        <span className="text-[13px] text-white/50 truncate block">
          <span className="text-white/70">{row.units?.properties?.name || '--'}</span>
          <span className="text-white/20 mx-1">/</span>
          <span>{row.units?.unit_number || '--'}</span>
        </span>
      ),
    },
    {
      key: 'rent',
      label: 'Rent',
      span: 2,
      render: (row) => (
        <span className="text-[13px] font-mono text-white/50">
          ${Number(row.monthly_rent).toLocaleString()}<span className="text-white/25">/mo</span>
        </span>
      ),
    },
    {
      key: 'dates',
      label: 'Start \u2013 End',
      span: 2,
      render: (row) => (
        <span className="text-[13px] text-white/40 truncate block">
          {formatDate(row.lease_start)} \u2013 {formatDate(row.lease_end)}
        </span>
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
      label: '',
      span: 1,
      align: 'right',
      isAction: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded-md text-white/30 hover:text-accent hover:bg-accent/10 transition-colors"
            title="Edit lease"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deletingId === row.id}
            className="p-1.5 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Delete lease"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [deletingId]);

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
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 sm:max-w-sm">
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
        <>
          <AnimatedTable<LeaseRow>
            columns={leaseColumns}
            data={paginated}
            getKey={(row) => row.id}
            getRowNumber={(_, i) => String((page - 1) * pageSize + i + 1).padStart(2, '0')}
            getRowStatus={(row) => mapLeaseStatus(row.status)}
            title="Leases"
            subtitle={`${filtered.length} lease${filtered.length !== 1 ? 's' : ''}`}
            headerRight={
              <Button icon={<Plus size={16} />} onClick={handleAdd}>
                New Lease
              </Button>
            }
            emptyState={
              <p className="text-sm text-white/40">No leases found.</p>
            }
          />
          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </>
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
