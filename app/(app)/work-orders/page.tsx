'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input, SelectField } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WorkOrderFormModal } from '@/components/work-orders/WorkOrderFormModal';
import { Wrench, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

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

const priorityColors: Record<string, string> = {
  emergency: 'bg-red-500/10 text-red-500',
  high: 'bg-orange-500/10 text-orange-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  low: 'bg-green-500/10 text-green-500',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-500/10 text-red-500',
  assigned: 'bg-yellow-500/10 text-yellow-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  parts_needed: 'bg-purple-500/10 text-purple-500',
  completed: 'bg-green-500/10 text-green-500',
  closed: 'bg-gray-500/10 text-gray-500',
  cancelled: 'bg-gray-400/10 text-gray-400',
};

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
  const supabase = createClient();

  const fetchWorkOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    const { data } = await supabase
      .from('work_orders')
      .select('*, properties(name), units(unit_number), tenants(first_name, last_name), vendors(name, company)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    setWorkOrders((data as WorkOrderRow[]) || []);
    setLoading(false);
  }, [supabase]);

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
        <div className="glass-card overflow-hidden">
          <ResponsiveTable minWidth="900px">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Title</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property / Unit</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Category</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Priority</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Vendor</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Created</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((wo) => (
                <tr key={wo.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary max-w-[200px] truncate">{wo.title}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {wo.properties?.name || '—'}{wo.units ? ` / ${wo.units.unit_number}` : ''}
                  </td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{wo.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${priorityColors[wo.priority] || ''}`}>
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[wo.status] || ''}`}>
                      {wo.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {wo.vendors?.name || <span className="text-text-muted">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {formatDistanceToNow(new Date(wo.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingWO(wo); setFormOpen(true); }}
                        className="p-1.5 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(wo.id)}
                        className="p-1.5 rounded-md hover:bg-danger-muted text-text-muted hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </ResponsiveTable>
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
