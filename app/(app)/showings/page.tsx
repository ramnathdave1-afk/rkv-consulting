'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { SelectField, Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import ShowingFormModal from '@/components/showings/ShowingFormModal';
import toast from 'react-hot-toast';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  ChevronDown,
  Phone,
  Mail,
  User,
  Filter,
} from 'lucide-react';
import type { ShowingStatus, ShowingSource } from '@/lib/types';

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
  source: ShowingSource;
  follow_up_status: string;
  notes: string | null;
  created_at: string;
  properties: { name: string; address_line1: string } | null;
  units: { unit_number: string } | null;
}

const statusColors: Record<string, string> = {
  requested: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  scheduled: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  confirmed: 'bg-green-500/10 text-green-400 border border-green-500/20',
  completed: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  no_show: 'bg-red-500/10 text-red-400 border border-red-500/20',
  cancelled: 'bg-gray-400/10 text-gray-500 border border-gray-500/20',
};

const sourceLabels: Record<string, string> = {
  manual: 'Manual',
  ai_chat: 'AI Chat',
  website: 'Website',
  phone: 'Phone',
  walk_in: 'Walk-in',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

const QUICK_STATUS_OPTIONS: { value: ShowingStatus; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ShowingsPage() {
  const [showings, setShowings] = useState<ShowingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editShowing, setEditShowing] = useState<ShowingRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const handleQuickStatus = async (id: string, newStatus: ShowingStatus) => {
    try {
      const res = await fetch(`/api/showings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchShowings();
    } catch {
      toast.error('Failed to update status');
    }
  };

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

  // Apply filters
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
    return true;
  }), [showings, statusFilter, dateFrom, dateTo]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo]);

  // Split into upcoming vs past, then paginate
  const now = new Date();
  const { upcoming, past, sortedAll } = useMemo(() => {
    const up = filtered
      .filter((s) => ['requested', 'scheduled', 'confirmed'].includes(s.status) && isAfter(parseISO(s.scheduled_at), now))
      .sort((a, b) => parseISO(a.scheduled_at).getTime() - parseISO(b.scheduled_at).getTime());
    const p = filtered
      .filter((s) => !up.includes(s))
      .sort((a, b) => parseISO(b.scheduled_at).getTime() - parseISO(a.scheduled_at).getTime());
    return { upcoming: up, past: p, sortedAll: [...up, ...p] };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const paginatedAll = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedAll.slice(start, start + pageSize);
  }, [sortedAll, page, pageSize]);

  // Split paginated results back into upcoming/past for display
  const upcomingIds = useMemo(() => new Set(upcoming.map((s) => s.id)), [upcoming]);
  const paginatedUpcoming = useMemo(() => paginatedAll.filter((s) => upcomingIds.has(s.id)), [paginatedAll, upcomingIds]);
  const paginatedPast = useMemo(() => paginatedAll.filter((s) => !upcomingIds.has(s.id)), [paginatedAll, upcomingIds]);

  const hasFilters = statusFilter || dateFrom || dateTo;
  const clearFilters = () => { setStatusFilter(''); setDateFrom(''); setDateTo(''); };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Showings</h1>
          <p className="text-sm text-text-secondary">
            {upcoming.length} upcoming, {past.length} past
            {hasFilters && (
              <button onClick={clearFilters} className="ml-2 text-accent hover:underline text-xs">
                Clear filters
              </button>
            )}
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openAdd}>
          Schedule Showing
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-text-muted" />
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
          <Input
            label="From Date"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="To Date"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <CalendarDays size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {hasFilters ? 'No showings match your filters' : 'No showings yet'}
          </h3>
          <p className="text-sm text-text-secondary">
            {hasFilters
              ? 'Try adjusting your filters or clear them to see all showings.'
              : 'Showings will appear here when prospects schedule tours via SMS or when you create them manually.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {paginatedUpcoming.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                Upcoming ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedUpcoming.map((s) => (
                  <ShowingCard
                    key={s.id}
                    showing={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => setDeleteId(s.id)}
                    onStatusChange={(newStatus) => handleQuickStatus(s.id, newStatus)}
                  />
                ))}
              </div>
            </section>
          )}
          {paginatedPast.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                Past ({past.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedPast.map((s) => (
                  <ShowingCard
                    key={s.id}
                    showing={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => setDeleteId(s.id)}
                    onStatusChange={(newStatus) => handleQuickStatus(s.id, newStatus)}
                  />
                ))}
              </div>
            </section>
          )}
          <div className="glass-card overflow-hidden">
            <Pagination
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </div>
        </div>
      )}

      {/* Modal */}
      <ShowingFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditShowing(null);
        }}
        showing={editShowing as never}
        onSaved={fetchShowings}
      />

      {/* Delete confirm */}
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

// ─── Showing Card ──────────────────────────────────────────────────

interface ShowingCardProps {
  showing: ShowingRow;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ShowingStatus) => void;
}

function ShowingCard({ showing, onEdit, onDelete, onStatusChange }: ShowingCardProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const date = parseISO(showing.scheduled_at);

  return (
    <div className="glass-card p-4 flex flex-col justify-between gap-3 group hover:border-accent/30 transition-colors">
      {/* Top: date badge + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-xs font-bold text-accent leading-none">{format(date, 'MMM')}</span>
            <span className="text-lg font-bold text-text-primary leading-none">{format(date, 'd')}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">
              {showing.prospect_name || showing.prospect_phone || 'Unknown prospect'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={10} className="text-text-muted shrink-0" />
              <span className="text-[11px] text-text-muted truncate">
                {showing.properties?.name || 'Unknown property'}
                {showing.units ? ` / ${showing.units.unit_number}` : ''}
              </span>
            </div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${statusColors[showing.status] || ''}`}>
          {showing.status.replace('_', ' ')}
        </span>
      </div>

      {/* Middle: details */}
      <div className="space-y-1.5 text-[11px] text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-text-muted shrink-0" />
          <span>{format(date, 'h:mm a')} ({showing.duration_minutes} min)</span>
        </div>
        {showing.prospect_phone && (
          <div className="flex items-center gap-1.5">
            <Phone size={10} className="text-text-muted shrink-0" />
            <span>{showing.prospect_phone}</span>
          </div>
        )}
        {showing.prospect_email && (
          <div className="flex items-center gap-1.5">
            <Mail size={10} className="text-text-muted shrink-0" />
            <span className="truncate">{showing.prospect_email}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <User size={10} className="text-text-muted shrink-0" />
          <span>Source: {sourceLabels[showing.source] || showing.source}</span>
        </div>
      </div>

      {showing.notes && (
        <p className="text-[11px] text-text-muted italic line-clamp-2">{showing.notes}</p>
      )}

      {/* Bottom: actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        {/* Quick status dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Update Status <ChevronDown size={12} />
          </button>
          {statusOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
              <div className="absolute left-0 bottom-full mb-1 z-20 bg-bg-secondary border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                {QUICK_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onStatusChange(opt.value);
                      setStatusOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-bg-elevated ${
                      showing.status === opt.value ? 'text-accent font-semibold' : 'text-text-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
