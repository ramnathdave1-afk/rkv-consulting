'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input, SelectField } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable, StatusBadge, type TableColumn } from '@/components/ui/AnimatedTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WorkOrderFormModal } from '@/components/work-orders/WorkOrderFormModal';
import { Wrench, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkOrderRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  source: string;
  scheduled_date: string | null;
  cost: number | null;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  vendor_id: string | null;
  created_at: string;
  properties: { name: string } | null;
  units: { unit_number: string } | null;
  tenants: { first_name: string; last_name: string } | null;
  vendors: { name: string; company: string | null } | null;
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'parts_needed', label: 'Parts Needed' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
];

const priorityFilterOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingWO, setEditingWO] = useState<WorkOrderRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fetchWorkOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/work-orders/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load work orders');
      setWorkOrders((json.items as WorkOrderRow[]) || []);
    } catch (err) {
      console.error('Failed to fetch work orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkOrders(); }, [fetchWorkOrders]);

  const filtered = useMemo(() => workOrders.filter((wo) => {
    if (statusFilter && wo.status !== statusFilter) return false;
    if (priorityFilter && wo.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches = wo.title.toLowerCase().includes(q) ||
        wo.properties?.name?.toLowerCase().includes(q) ||
        wo.tenants?.first_name?.toLowerCase().includes(q) ||
        wo.tenants?.last_name?.toLowerCase().includes(q) ||
        wo.vendors?.name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  }), [workOrders, search, statusFilter, priorityFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/work-orders/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Work order deleted');
      fetchWorkOrders();
    } else {
      toast.error('Failed to delete');
    }
    setDeleteId(null);
  }

  // Row # = 1 col, remaining columns must sum to 11
  const columns: TableColumn<WorkOrderRow>[] = useMemo(() => [
    {
      key: 'title',
      label: 'Title',
      span: 3,
      render: (wo) => (
        <span className="font-medium text-white/90 text-[13px] truncate block">{wo.title}</span>
      ),
    },
    {
      key: 'property',
      label: 'Property / Unit',
      span: 2,
      render: (wo) => (
        <span className="text-white/50 text-[13px] truncate block">
          {wo.properties?.name || '\u2014'}{wo.units ? ` / ${wo.units.unit_number}` : ''}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      span: 1,
      render: (wo) => (
        <span className="text-white/40 text-[13px] capitalize truncate block">{wo.category.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      span: 1,
      render: (wo) => <StatusBadge status={wo.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      span: 2,
      render: (wo) => <StatusBadge status={wo.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 2,
      align: 'right',
      isAction: true,
      render: (wo) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingWO(wo); setFormOpen(true); }}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(wo.id); }}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
            title="Delete"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Work Orders</h1>
          <p className="text-sm text-text-secondary">{filtered.length} work orders</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setEditingWO(null); setFormOpen(true); }}>
          New Work Order
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="flex-1 sm:min-w-[200px]">
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-full sm:w-40">
          <SelectField options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        </div>
        <div className="w-full sm:w-40">
          <SelectField options={priorityFilterOptions} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Wrench size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {workOrders.length === 0 ? 'No work orders' : 'No matching work orders'}
          </h3>
          <p className="text-sm text-text-secondary">
            {workOrders.length === 0
              ? 'Create your first work order or they will appear when tenants submit maintenance requests.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div>
          <AnimatedTable<WorkOrderRow>
            columns={columns}
            data={paginated}
            getKey={(row) => row.id}
            getRowNumber={(row, i) => String((page - 1) * pageSize + i + 1).padStart(2, '0')}
            getRowStatus={(row) =>
              row.priority === 'emergency' ? 'critical'
                : row.status === 'open' ? 'warning'
                : row.status === 'completed' || row.status === 'closed' ? 'success'
                : 'default'
            }
            emptyState={
              <p className="text-white/30 text-sm">No work orders found.</p>
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

      <WorkOrderFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        workOrder={editingWO as any}
        onSuccess={fetchWorkOrders}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Work Order"
        description="This will permanently delete this work order. This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
