'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input, SelectField } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import ChecklistDetailModal from '@/components/move-ins/ChecklistDetailModal';
import CreateMoveInModal from '@/components/move-ins/CreateMoveInModal';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  Search,
} from 'lucide-react';

interface MoveInChecklist {
  id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  move_in_date: string | null;
  welcome_email_sent: boolean;
  completed_at: string | null;
  created_at: string;
  tenants: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  properties: { id: string; name: string; address_line1: string } | null;
  units: { id: string; unit_number: string } | null;
  total_items: number;
  completed_items: number;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
  in_progress: 'bg-sky-50 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
};

function StatusBadgeOps({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {STATUS_LABEL[status] || status.replace(/_/g, ' ')}
    </span>
  );
}

export default function MoveInsPage() {
  const [checklists, setChecklists] = useState<MoveInChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await fetch('/api/move-ins');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setChecklists(json.checklists || []);
    } catch {
      toast.error('Failed to load move-ins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const filtered = useMemo(() => checklists.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const tenantName = c.tenants ? `${c.tenants.first_name} ${c.tenants.last_name}`.toLowerCase() : '';
      const propName = (c.properties?.name || '').toLowerCase();
      const unit = (c.units?.unit_number || '').toLowerCase();
      if (!tenantName.includes(q) && !propName.includes(q) && !unit.includes(q)) return false;
    }
    return true;
  }), [checklists, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      if (!a.move_in_date && !b.move_in_date) return 0;
      if (!a.move_in_date) return 1;
      if (!b.move_in_date) return -1;
      return parseISO(a.move_in_date).getTime() - parseISO(b.move_in_date).getTime();
    }),
    [filtered],
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // KPIs
  const scheduled = useMemo(() => checklists.filter((c) => c.status === 'pending').length, [checklists]);
  const inProgress = useMemo(() => checklists.filter((c) => c.status === 'in_progress').length, [checklists]);
  const completed = useMemo(() => checklists.filter((c) => c.status === 'completed').length, [checklists]);

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Move-Ins</h1>
          <p className="text-sm text-slate-500 mt-1">
            {scheduled} scheduled · {inProgress} in progress · {completed} completed
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          New Move-In
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 md:max-w-sm">
          <Input
            placeholder="Search tenant, property, or unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-full md:w-44">
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <ClipboardCheck size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-[#020617] mb-2">
            {checklists.length === 0 ? 'No move-ins yet' : 'No move-ins match your filters'}
          </h3>
          <p className="text-sm text-slate-500">
            {checklists.length === 0
              ? 'Create your first move-in checklist to start tracking tenant onboarding.'
              : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Property / Unit</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Move-In Date</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((c, i) => {
                  const pct = c.total_items > 0 ? Math.round((c.completed_items / c.total_items) * 100) : 0;
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => openDetail(c.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#020617] truncate max-w-[180px]">
                          {c.tenants ? `${c.tenants.first_name} ${c.tenants.last_name}` : 'Unknown'}
                        </div>
                        {c.tenants?.email && (
                          <div className="text-xs text-slate-500 truncate max-w-[180px]">{c.tenants.email}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <div className="truncate max-w-[200px]">
                          {c.properties?.name || '—'}
                          {c.units ? <span className="text-slate-400"> / {c.units.unit_number}</span> : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 tabular-nums">
                        {c.move_in_date ? format(parseISO(c.move_in_date), 'MMM d, yyyy') : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                            {c.completed_items}/{c.total_items}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadgeOps status={c.status} />
                      </td>
                    </motion.tr>
                  );
                })}
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

      <CreateMoveInModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchChecklists}
      />
      <ChecklistDetailModal
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailId(null);
        }}
        checklistId={detailId}
        onUpdated={fetchChecklists}
      />
    </div>
  );
}
