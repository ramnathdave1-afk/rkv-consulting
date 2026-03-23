'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import VendorFormModal from '@/components/vendors/VendorFormModal';
import { HardHat, Plus, Star, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Vendor } from '@/lib/types';

const SPECIALTY_OPTIONS = [
  'plumbing', 'electrical', 'hvac', 'appliance', 'pest',
  'structural', 'cosmetic', 'safety', 'general', 'turnover',
];

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
  const supabase = createClient();

  const fetchVendors = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('name', { ascending: true });

    setVendors((data as Vendor[]) || []);
    setLoading(false);
  }, [supabase]);

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
    if (rating == null) return <span className="text-text-muted">--</span>;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={
              i < full
                ? 'text-yellow-500 fill-yellow-500'
                : i === full && half
                  ? 'text-yellow-500 fill-yellow-500/50'
                  : 'text-text-muted'
            }
          />
        ))}
        <span className="ml-1 text-xs text-text-secondary">{rating}</span>
      </span>
    );
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
        <div className="glass-card overflow-hidden">
          <ResponsiveTable minWidth="800px">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Company</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Contact</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Specialties</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rate</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rating</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    {/* Name + Preferred badge */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{v.name}</span>
                        {v.is_preferred && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/15 text-yellow-500 border border-yellow-500/20">
                            <Star size={9} className="fill-yellow-500" />
                            Preferred
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Company */}
                    <td className="px-4 py-3 text-text-secondary">{v.company || '--'}</td>
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {v.email && <div className="text-text-secondary text-xs">{v.email}</div>}
                        {v.phone && <div className="text-text-secondary text-xs">{v.phone}</div>}
                        {!v.email && !v.phone && <span className="text-text-muted">--</span>}
                      </div>
                    </td>
                    {/* Specialties as tags */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(v.specialty || []).map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent capitalize"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Rate */}
                    <td className="px-4 py-3 text-text-secondary">
                      {v.hourly_rate != null ? `$${v.hourly_rate}/hr` : '--'}
                    </td>
                    {/* Rating */}
                    <td className="px-4 py-3">{renderStars(v.rating)}</td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                          title="Edit vendor"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          disabled={deletingId === v.id}
                          className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                          title="Delete vendor"
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
