'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable } from '@/components/ui/AnimatedTable';
import type { TableColumn, RowStatus } from '@/components/ui/AnimatedTable';
import { PropertyFormModal } from '@/components/properties/PropertyFormModal';
import { LocationFilter } from '@/components/settings/LocationFilter';
import { useLocations } from '@/lib/hooks/useLocations';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { Property } from '@/lib/types';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/properties/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load properties');
      setProperties((json.items as Property[]) || []);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const { activeLocationId } = useLocations();

  const filtered = useMemo(() => {
    let list = properties;
    if (activeLocationId) {
      list = list.filter((p) => (p as Property & { location_id?: string | null }).location_id === activeLocationId);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address_line1.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.zip.includes(q) ||
        p.property_type.replace('_', ' ').toLowerCase().includes(q),
    );
  }, [properties, search, activeLocationId]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, activeLocationId]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openAdd() {
    setEditingProperty(null);
    setFormOpen(true);
  }

  function openEdit(property: Property) {
    setEditingProperty(property);
    setFormOpen(true);
  }

  function openDelete(property: Property) {
    setDeletingProperty(property);
    setDeleteOpen(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function resetFilters() {
    setSearch('');
  }

  async function handleDelete() {
    if (!deletingProperty) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/properties/${deletingProperty.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      toast.success('Property deleted');
      setDeleteOpen(false);
      setDeletingProperty(null);
      fetchProperties();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete property';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }

  // Row # = 1 col, remaining columns must sum to 11
  const propertyColumns: TableColumn<Property>[] = useMemo(() => [
    {
      key: 'select',
      label: '',
      span: 1,
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={() => toggleSelect(row.id)}
            className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
          />
        </div>
      ),
    },
    {
      key: 'thumb',
      label: '',
      span: 1,
      render: () => (
        <div className="h-9 w-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
          <Building2 size={16} />
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Property',
      span: 4,
      render: (row) => (
        <Link href={`/properties/${row.id}`} className="block min-w-0">
          <div className="font-medium text-[13px] text-[#020617] truncate">{row.address_line1}</div>
          <div className="text-xs text-slate-500 truncate">{row.city}, {row.state} {row.zip} &middot; {row.name}</div>
        </Link>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      span: 2,
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
          {row.property_type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'units',
      label: 'Units',
      span: 1,
      align: 'right',
      render: (row) => <span className="text-[13px] tabular-nums text-[#020617] font-medium">{row.unit_count}</span>,
    },
    {
      key: 'actions',
      label: '',
      span: 2,
      align: 'right',
      isAction: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors"
            title="Edit property"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => openDelete(row)}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete property"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [selectedIds]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#020617]">Properties</h1>
          <p className="text-sm text-slate-500 mt-1">
            {properties.length} total &middot; {filtered.length} matching filters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">Import CSV</Button>
          <Button icon={<Plus size={16} />} onClick={openAdd}>
            Add Property
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {properties.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, address, city, state, ZIP, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={14} />}
            />
          </div>
          <LocationFilter />
          <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
        </div>
      )}

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 bg-white border border-slate-200 rounded-lg p-3 mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">Update Status</Button>
            <Button variant="ghost" size="sm">Export</Button>
            <Button variant="danger" size="sm">Delete</Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
          </div>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <Building2 size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="font-display text-lg font-semibold text-[#020617] mb-2">No properties yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add your first property or connect a PM platform to import.</p>
          <Button icon={<Plus size={16} />} onClick={openAdd}>
            Add Property
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <Search size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="font-display text-lg font-semibold text-[#020617] mb-2">No results</h3>
          <p className="text-sm text-slate-500">No properties match &quot;{search}&quot;. Try a different search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <AnimatedTable<Property>
            columns={propertyColumns}
            data={paginated}
            getKey={(row) => row.id}
            getRowStatus={() => 'active' as RowStatus}
            emptyState={
              <p className="text-sm text-slate-500">No properties found.</p>
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
      <PropertyFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        property={editingProperty}
        onSuccess={fetchProperties}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Property"
        description={`Are you sure you want to delete "${deletingProperty?.name || ''}"? This action cannot be undone and will remove all associated units, leases, and work orders.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
