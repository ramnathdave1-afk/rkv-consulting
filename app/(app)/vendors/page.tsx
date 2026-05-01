'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input, SelectField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import VendorFormModal from '@/components/vendors/VendorFormModal';
import { HardHat, Plus, Star, Search, Pencil, Trash2, ChevronDown, MapPin, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import type { Vendor } from '@/lib/types';

const SPECIALTY_OPTIONS = [
  'plumbing', 'electrical', 'hvac', 'appliance', 'pest',
  'structural', 'cosmetic', 'safety', 'general', 'turnover',
];

const SPECIALTY_BADGE_CLASS: Record<string, string> = {
  plumbing: 'bg-sky-50 text-sky-700 border border-sky-200',
  electrical: 'bg-amber-50 text-amber-700 border border-amber-200',
  hvac: 'bg-sky-50 text-sky-700 border border-sky-200',
  appliance: 'bg-violet-50 text-violet-700 border border-violet-200',
  pest: 'bg-red-50 text-red-700 border border-red-200',
  structural: 'bg-amber-50 text-amber-700 border border-amber-200',
  cosmetic: 'bg-violet-50 text-violet-700 border border-violet-200',
  safety: 'bg-red-50 text-red-700 border border-red-200',
  general: 'bg-slate-100 text-slate-700 border border-slate-200',
  turnover: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

function VendorAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700 shrink-0">
      {initials}
    </div>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-slate-300 text-xs">No rating</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < full
              ? 'text-amber-400 fill-amber-400'
              : i === full && half
                ? 'text-amber-400 fill-amber-400/50'
                : 'text-slate-200'
          }
        />
      ))}
      <span className="ml-1 text-xs text-slate-500 tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

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

  const locationOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        vendors
          .map((v) => (v as Vendor & { city?: string | null }).city)
          .filter((c): c is string => Boolean(c)),
      ),
    ).sort();
    return [
      { value: '', label: 'All Locations' },
      ...unique.map((c) => ({ value: c, label: c })),
    ];
  }, [vendors]);

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
    if (locationFilter) {
      list = list.filter((v) => (v as Vendor & { city?: string | null }).city === locationFilter);
    }
    return list;
  }, [vendors, search, specialtyFilter, locationFilter]);

  useEffect(() => { setPage(1); }, [search, specialtyFilter, locationFilter]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, specialtyFilter, locationFilter, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // KPIs
  const activeCount = useMemo(() => vendors.filter((v) => (v as Vendor & { is_active?: boolean }).is_active !== false).length, [vendors]);
  const preferredCount = useMemo(() => vendors.filter((v) => v.is_preferred).length, [vendors]);

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

  function toggleCard(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkSetActive(active: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/vendors/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: active }),
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    toast.success(`${active ? 'Activated' : 'Deactivated'} ${ok} of ${ids.length} vendors`);
    setSelectedIds(new Set());
    setBulkOpen(false);
    fetchVendors();
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} vendor{filtered.length !== 1 ? 's' : ''} · {activeCount} active · {preferredCount} preferred
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
                      onClick={() => bulkSetActive(true)}
                      className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => bulkSetActive(false)}
                      className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <Button icon={<Plus size={16} />} onClick={openAdd}>
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1 md:max-w-sm">
          <Input
            placeholder="Search name, company, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
        <div className="w-full md:w-48">
          <SelectField
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...SPECIALTY_OPTIONS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
            ]}
          />
        </div>
        {locationOptions.length > 1 && (
          <div className="w-full md:w-48">
            <SelectField
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              options={locationOptions}
            />
          </div>
        )}
      </div>

      {/* Vendor cards grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <HardHat size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-[#020617] mb-2">
            {vendors.length === 0 ? 'No vendors yet' : 'No matching vendors'}
          </h3>
          <p className="text-sm text-slate-500">
            {vendors.length === 0
              ? 'Add your maintenance vendors for automatic dispatch.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((v, i) => {
              const vAny = v as Vendor & { city?: string | null; is_active?: boolean };
              const isActive = vAny.is_active !== false;
              const isSelected = selectedIds.has(v.id);
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group ${
                    isSelected ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCard(v.id)}
                          className="h-4 w-4 rounded border-slate-300 mt-1"
                        />
                        <VendorAvatar name={v.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-[#020617] truncate">{v.name}</h3>
                            {v.is_preferred && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Star size={9} className="fill-amber-400 text-amber-400" /> Pref
                              </span>
                            )}
                          </div>
                          {v.company && <p className="text-xs text-slate-500 truncate">{v.company}</p>}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Specialties */}
                    {v.specialty && v.specialty.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.specialty.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                              SPECIALTY_BADGE_CLASS[s] || 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {s}
                          </span>
                        ))}
                        {v.specialty.length > 4 && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400">
                            +{v.specialty.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="space-y-1 text-xs">
                      {v.email && (
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <Mail size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{v.email}</span>
                        </div>
                      )}
                      {v.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600 tabular-nums">
                          <Phone size={11} className="text-slate-400 shrink-0" />
                          {v.phone}
                        </div>
                      )}
                      {vAny.city && (
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{vAny.city}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: rating + rate + actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <StarRating rating={v.rating} />
                        {v.hourly_rate != null && (
                          <span className="text-xs text-slate-500 tabular-nums">${v.hourly_rate}/hr</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          disabled={deletingId === v.id}
                          className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </>
      )}

      <VendorFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vendor={editingVendor}
        onSuccess={fetchVendors}
      />
    </div>
  );
}
