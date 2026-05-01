'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input, SelectField } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WorkOrderFormModal } from '@/components/work-orders/WorkOrderFormModal';
import { LocationFilter } from '@/components/settings/LocationFilter';
import { useLocations } from '@/lib/hooks/useLocations';
import { Wrench, Plus, Search, Pencil, Trash2, UserCircle2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

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
  location_id: string | null;
  triage_classified?: boolean;
  properties: { name: string; location_id?: string | null } | null;
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

/* ── Status badge map (canonical operations) ─────────────────────── */
const STATUS_BADGE_CLASS: Record<string, string> = {
  open: 'bg-red-50 text-red-700 border border-red-200',
  pending: 'bg-red-50 text-red-700 border border-red-200',
  assigned: 'bg-amber-50 text-amber-700 border border-amber-200',
  scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
  in_progress: 'bg-sky-50 text-sky-700 border border-sky-200',
  make_ready: 'bg-sky-50 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  done: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  closed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-700 border border-slate-200',
  emergency: 'bg-red-50 text-red-700 border border-red-200 animate-pulse',
  critical: 'bg-red-50 text-red-700 border border-red-200 animate-pulse',
  parts_needed: 'bg-violet-50 text-violet-700 border border-violet-200',
};

function StatusBadgeOps({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize whitespace-nowrap ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

const PRIORITY_PILL: Record<string, { label: string; cls: string }> = {
  emergency: { label: 'Emergency', cls: 'bg-red-50 text-red-700 border border-red-200 animate-pulse' },
  high: { label: 'High', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  medium: { label: 'Standard', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  standard: { label: 'Standard', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-500 border border-slate-200' },
};

function PriorityPill({ priority }: { priority: string }) {
  const p = PRIORITY_PILL[priority] || PRIORITY_PILL.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ${p.cls}`}>
      {p.label}
    </span>
  );
}

function daysSince(iso: string): number {
  const created = new Date(iso).getTime();
  return Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
}

function VendorAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
      {initials}
    </span>
  );
}

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

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

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

  const { activeLocationId } = useLocations();

  const filtered = useMemo(() => workOrders.filter((wo) => {
    if (statusFilter && wo.status !== statusFilter) return false;
    if (priorityFilter && wo.priority !== priorityFilter) return false;
    if (activeLocationId) {
      const woLoc = wo.location_id || wo.properties?.location_id || null;
      if (woLoc !== activeLocationId) return false;
    }
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
  }), [workOrders, search, statusFilter, priorityFilter, activeLocationId]);

  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, activeLocationId]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, statusFilter, priorityFilter, activeLocationId, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // KPIs
  const openCount = useMemo(() => workOrders.filter((w) => w.status === 'open').length, [workOrders]);
  const inProgressCount = useMemo(() => workOrders.filter((w) => w.status === 'in_progress').length, [workOrders]);
  const completedToday = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return workOrders.filter((w) => {
      if (w.status !== 'completed' && w.status !== 'closed') return false;
      const dt = new Date(w.created_at);
      return dt >= today;
    }).length;
  }, [workOrders]);

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

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((w) => w.id)));
    }
  }

  async function bulkUpdateStatus(newStatus: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/work-orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    toast.success(`Updated ${ok} of ${ids.length} work orders`);
    setSelectedIds(new Set());
    setBulkOpen(false);
    fetchWorkOrders();
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
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            {openCount} open · {inProgressCount} in progress · {completedToday} completed today
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setBulkOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Bulk Actions ({selectedIds.size}) <ChevronDown size={14} />
              </button>
              {bulkOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                    <button
                      onClick={() => bulkUpdateStatus('assigned')}
                      className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Assign Vendor
                    </button>
                    <button
                      onClick={() => bulkUpdateStatus('in_progress')}
                      className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Mark In Progress
                    </button>
                    <button
                      onClick={() => bulkUpdateStatus('completed')}
                      className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Bulk Complete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <Button icon={<Plus size={16} />} onClick={() => { setEditingWO(null); setFormOpen(true); }}>
            New Work Order
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 md:max-w-sm">
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-full md:w-40">
          <SelectField options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
        </div>
        <div className="w-full md:w-40">
          <SelectField options={priorityFilterOptions} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} />
        </div>
        <div className="w-full md:w-auto">
          <LocationFilter />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <Wrench size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-[#020617] mb-2">
            {workOrders.length === 0 ? 'No work orders' : 'No matching work orders'}
          </h3>
          <p className="text-sm text-slate-500">
            {workOrders.length === 0
              ? 'Create your first work order or they will appear when tenants submit maintenance requests.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="px-4 py-3 w-10 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginated.length && paginated.length > 0}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Property / Unit</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Days Open</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((wo, i) => (
                  <motion.tr
                    key={wo.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(wo.id)}
                        onChange={() => toggleRow(wo.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <PriorityPill priority={wo.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#020617] truncate">{wo.title}</span>
                        {wo.triage_classified && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                            AI
                          </span>
                        )}
                      </div>
                      {wo.category && (
                        <div className="text-xs text-slate-500 capitalize mt-0.5">
                          {wo.category.replace(/_/g, ' ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div className="truncate max-w-[180px]">
                        {wo.properties?.name || '—'}
                        {wo.units ? <span className="text-slate-400"> / {wo.units.unit_number}</span> : ''}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {wo.vendors ? (
                        <div className="flex items-center gap-2">
                          <VendorAvatar name={wo.vendors.name} />
                          <span className="text-slate-700 text-xs truncate max-w-[120px]">{wo.vendors.name}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <UserCircle2 size={14} /> Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadgeOps status={wo.priority === 'emergency' ? 'emergency' : wo.status} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-500">
                      {daysSince(wo.created_at)}d
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingWO(wo); setFormOpen(true); }}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(wo.id); }}
                          className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
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
