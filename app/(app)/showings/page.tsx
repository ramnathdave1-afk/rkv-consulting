'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { SelectField, Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import ShowingFormModal from '@/components/showings/ShowingFormModal';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronDown,
} from 'lucide-react';
import type { ShowingStatus } from '@/lib/types';

interface ShowingRow {
  id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  prospect_name: string | null;
  prospect_phone: string | null;
  prospect_email: string | null;
  status: ShowingStatus;
  scheduled_at: string;
  duration_minutes: number;
  source: string;
  follow_up_status: string;
  notes: string | null;
  created_at: string;
  reminder_sent_at?: string | null;
  agent_name?: string | null;
  properties: { name: string; address_line1: string } | null;
  units: { unit_number: string } | null;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-700 border border-amber-200',
  scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 border border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  no_show: 'bg-red-50 text-red-700 border border-red-200',
  cancelled: 'bg-slate-100 text-slate-700 border border-slate-200',
};

function StatusBadgeOps({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize whitespace-nowrap ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(ms / (1000 * 60 * 60));
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ShowingsPage() {
  const [showings, setShowings] = useState<ShowingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editShowing, setEditShowing] = useState<ShowingRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const fetchShowings = useCallback(async () => {
    try {
      const res = await fetch('/api/showings');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setShowings(json.showings || []);
    } catch {
      toast.error('Failed to load showings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShowings();
  }, [fetchShowings]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/showings/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Showing deleted');
      fetchShowings();
    } catch {
      toast.error('Failed to delete showing');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const openEdit = (s: ShowingRow) => {
    setEditShowing(s);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditShowing(null);
    setModalOpen(true);
  };

  const filtered = useMemo(() => showings.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (dateFrom) {
      const from = startOfDay(parseISO(dateFrom));
      if (isBefore(parseISO(s.scheduled_at), from)) return false;
    }
    if (dateTo) {
      const to = endOfDay(parseISO(dateTo));
      if (isAfter(parseISO(s.scheduled_at), to)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const m = (s.prospect_name || '').toLowerCase().includes(q) ||
        (s.properties?.name || '').toLowerCase().includes(q) ||
        (s.units?.unit_number || '').toLowerCase().includes(q);
      if (!m) return false;
    }
    return true;
  }), [showings, statusFilter, dateFrom, dateTo, search]);

  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo, search]);
  useEffect(() => { setSelectedIds(new Set()); }, [statusFilter, dateFrom, dateTo, search, page]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime()),
    [filtered],
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  // KPIs
  const upcoming = useMemo(() => {
    const now = new Date();
    return showings.filter((s) =>
      ['requested', 'scheduled', 'confirmed'].includes(s.status) && isAfter(parseISO(s.scheduled_at), now),
    ).length;
  }, [showings]);
  const completed = useMemo(() => showings.filter((s) => s.status === 'completed').length, [showings]);
  const noShows = useMemo(() => showings.filter((s) => s.status === 'no_show').length, [showings]);

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
      setSelectedIds(new Set(paginated.map((s) => s.id)));
    }
  }

  async function bulkSendReminder() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/showings/${id}/reminder`, { method: 'POST' }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    toast.success(`Sent ${ok} of ${ids.length} reminders`);
    setSelectedIds(new Set());
    setBulkOpen(false);
    fetchShowings();
  }

  async function bulkMarkNoShow() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/showings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'no_show' }),
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    toast.success(`Marked ${ok} as no-show`);
    setSelectedIds(new Set());
    setBulkOpen(false);
    fetchShowings();
  }

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
          <h1 className="font-display text-2xl font-bold text-[#020617]">Showings</h1>
          <p className="text-sm text-slate-500 mt-1">
            {upcoming} upcoming · {completed} completed · {noShows} no-shows
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
                      onClick={bulkSendReminder}
                      className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Send Reminder
                    </button>
                    <button
                      onClick={bulkMarkNoShow}
                      className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Mark No-Show
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <Button icon={<Plus size={16} />} onClick={openAdd}>
            Schedule Showing
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 md:max-w-sm">
          <Input
            placeholder="Search prospect, property, or unit..."
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
        <div className="w-full md:w-40">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="w-full md:w-40">
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <CalendarDays size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-[#020617] mb-2">
            {showings.length === 0 ? 'No showings yet' : 'No showings match your filters'}
          </h3>
          <p className="text-sm text-slate-500">
            {showings.length === 0
              ? 'Showings appear here when prospects schedule tours via SMS or you create them manually.'
              : 'Try adjusting your filters.'}
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
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Prospect</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Property / Unit</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reminder</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((s, i) => {
                  const dt = parseISO(s.scheduled_at);
                  const now = new Date();
                  const isPast = isBefore(dt, now);
                  const isNoShowCandidate = isPast && ['scheduled', 'confirmed', 'requested'].includes(s.status);
                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleRow(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-slate-500 leading-none uppercase">{format(dt, 'MMM')}</span>
                            <span className="text-base font-bold text-[#020617] leading-none mt-0.5">{format(dt, 'd')}</span>
                          </div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            {format(dt, 'h:mm a')}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-[#020617] truncate max-w-[160px]">
                          {s.prospect_name || s.prospect_phone || 'Unknown'}
                        </div>
                        {s.prospect_phone && s.prospect_name && (
                          <div className="text-xs text-slate-500 truncate">{s.prospect_phone}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <div className="truncate max-w-[180px]">
                          {s.properties?.name || '—'}
                          {s.units ? <span className="text-slate-400"> / {s.units.unit_number}</span> : ''}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-xs">
                        {s.agent_name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadgeOps status={s.status} />
                          {isNoShowCandidate && s.status !== 'no_show' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                              past
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {s.reminder_sent_at ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Sent {timeAgo(s.reminder_sent_at)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteId(s.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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

      <ShowingFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditShowing(null);
        }}
        showing={editShowing as never}
        onSaved={fetchShowings}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Showing"
        description="Are you sure you want to delete this showing? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
