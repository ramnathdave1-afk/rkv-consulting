'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable, StatusBadge, type TableColumn } from '@/components/ui/AnimatedTable';
import VendorFormModal from '@/components/vendors/VendorFormModal';
import { HardHat, Plus, Star, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Vendor } from '@/lib/types';

const SPECIALTY_OPTIONS = [
  'plumbing', 'electrical', 'hvac', 'appliance', 'pest',
  'structural', 'cosmetic', 'safety', 'general', 'turnover',
];

const specialtyColors: Record<string, string> = {
  plumbing: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  electrical: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  hvac: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  appliance: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  pest: 'bg-red-500/10 border-red-500/20 text-red-400',
  structural: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  cosmetic: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
  safety: 'bg-red-500/10 border-red-500/20 text-red-400',
  general: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  turnover: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/vendors/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load vendors');
      setVendors((json.items as Vendor[]) || []);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const filtered = useMemo(() => {
    let list = vendors;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.company && v.company.toLowerCase().includes(q)) ||
          (v.email && v.email.toLowerCase().includes(q)) ||
          (v.phone && v.phone.includes(q)),
      );
    }
    if (specialtyFilter) {
      list = list.filter((v) => v.specialty?.includes(specialtyFilter));
    }
    return list;
  }, [vendors, search, specialtyFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, specialtyFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openAdd() {
    setEditingVendor(null);
    setModalOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setModalOpen(true);
  }

  async function handleDelete(vendor: Vendor) {
    if (!confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`)) return;
    setDeletingId(vendor.id);
    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete vendor');
      }
      toast.success('Vendor deleted');
      fetchVendors();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  function renderStars(rating: number | null) {
    if (rating == null) return <span className="text-white/20">--</span>;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={11}
            className={
              i < full
                ? 'text-yellow-500 fill-yellow-500'
                : i === full && half
                  ? 'text-yellow-500 fill-yellow-500/50'
                  : 'text-white/15'
            }
          />
        ))}
        <span className="ml-1 text-[11px] text-white/40">{rating}</span>
      </span>
    );
  }

  // Row # = 1 col, remaining columns must sum to 11
  const columns: TableColumn<Vendor>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Name / Company',
      span: 2,
      render: (v) => (
        <div className="min-w-0">
          <span className="font-medium text-white/90 text-[13px] truncate block">{v.name}</span>
          {v.company && <span className="text-white/35 text-[11px] truncate block">{v.company}</span>}
        </div>
      ),
    },
    {
      key: 'specialties',
      label: 'Specialties',
      span: 3,
      render: (v) => (
        <div className="flex gap-1 flex-wrap overflow-hidden max-h-[36px]">
          {(v.specialty || []).map((s) => (
            <span
              key={s}
              className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-medium capitalize ${specialtyColors[s] || 'bg-white/5 border-white/10 text-white/40'}`}
            >
              {s}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      span: 2,
      render: (v) => (
        <div className="space-y-0.5 min-w-0">
          {v.email && <div className="text-white/40 text-[13px] truncate">{v.email}</div>}
          {v.phone && <div className="text-white/40 text-[13px]">{v.phone}</div>}
          {!v.email && !v.phone && <span className="text-white/20">--</span>}
        </div>
      ),
    },
    {
      key: 'rate',
      label: 'Rate',
      span: 1,
      render: (v) => (
        <span className="text-white/50 text-[13px] font-mono">
          {v.hourly_rate != null ? `$${v.hourly_rate}/hr` : '--'}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      span: 1,
      render: (v) => renderStars(v.rating),
    },
    {
      key: 'preferred',
      label: 'Pref',
      span: 1,
      align: 'center',
      render: (v) =>
        v.is_preferred ? (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg border text-[10px] font-semibold bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
            <Star size={9} className="fill-yellow-400" />
            Pref
          </span>
        ) : (
          <span className="text-white/15 text-xs">--</span>
        ),
    },
    {
      key: 'actions',
      label: '',
      span: 1,
      align: 'right',
      isAction: true,
      render: (v) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(v); }}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors"
            title="Edit vendor"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
            disabled={deletingId === v.id}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Delete vendor"
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
          <h1 className="font-display text-xl font-bold text-text-primary">Vendors</h1>
          <p className="text-sm text-text-secondary">
            {filtered.length} vendor{filtered.length !== 1 ? 's' : ''}
            {(search || specialtyFilter) && ` (of ${vendors.length} total)`}
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openAdd}>
          Add Vendor
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name, company, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <select
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          className="h-9 px-3 text-sm bg-bg-primary text-text-primary border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-muted appearance-none"
        >
          <option value="">All Specialties</option>
          {SPECIALTY_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Vendor List */}
      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <HardHat size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {vendors.length === 0 ? 'No vendors yet' : 'No matching vendors'}
          </h3>
          <p className="text-sm text-text-secondary">
            {vendors.length === 0
              ? 'Add your maintenance vendors for automatic dispatch.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div>
          <AnimatedTable<Vendor>
            columns={columns}
            data={paginated}
            getKey={(row) => row.id}
            getRowNumber={(row, i) => String((page - 1) * pageSize + i + 1).padStart(2, '0')}
            getRowStatus={(row) =>
              row.is_preferred ? 'active'
                : row.rating != null && row.rating >= 4 ? 'info'
                : 'default'
            }
            emptyState={
              <p className="text-white/30 text-sm">No vendors found.</p>
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

      {/* Add/Edit Modal */}
      <VendorFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vendor={editingVendor}
        onSuccess={fetchVendors}
      />
    </div>
  );
}
