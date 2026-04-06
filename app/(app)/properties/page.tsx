'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedTable, StatusBadge } from '@/components/ui/AnimatedTable';
import type { TableColumn, RowStatus } from '@/components/ui/AnimatedTable';
import { PropertyFormModal } from '@/components/properties/PropertyFormModal';
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

  const filtered = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address_line1.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.zip.includes(q) ||
        p.property_type.replace('_', ' ').toLowerCase().includes(q),
    );
  }, [properties, search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search]);

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
      key: 'name',
      label: 'Name',
      span: 3,
      render: (row) => (
        <Link href={`/properties/${row.id}`} className="text-accent hover:underline font-medium text-[13px] truncate block">
          {row.name}
        </Link>
      ),
    },
    {
      key: 'address',
      label: 'Address',
      span: 3,
      render: (row) => (
        <span className="text-[13px] text-white/50 truncate block">{row.address_line1}, {row.city}, {row.state} {row.zip}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      span: 2,
      render: (row) => <StatusBadge status={row.property_type.replace('_', ' ')} />,
    },
    {
      key: 'units',
      label: 'Units',
      span: 1,
      render: (row) => <span className="text-[13px] text-white/50">{row.unit_count}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      span: 2,
      align: 'right',
      isAction: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg text-white/30 hover:text-accent hover:bg-accent/10 transition-colors"
            title="Edit property"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => openDelete(row)}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete property"
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
          <h1 className="font-display text-xl font-bold text-text-primary">Properties</h1>
          <p className="text-sm text-text-secondary">{properties.length} properties</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openAdd}>
          Add Property
        </Button>
      </div>

      {/* Search / Filter */}
      {properties.length > 0 && (
        <Input
          placeholder="Search by name, address, city, state, ZIP, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={14} />}
          className="w-full sm:max-w-md"
        />
      )}

      {properties.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Building2 size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No properties yet</h3>
          <p className="text-sm text-text-secondary mb-4">Add your first property or connect a PM platform to import.</p>
          <Button icon={<Plus size={16} />} onClick={openAdd}>
            Add Property
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Search size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No results</h3>
          <p className="text-sm text-text-secondary">No properties match &quot;{search}&quot;. Try a different search.</p>
        </div>
      ) : (
        <>
          <AnimatedTable<Property>
            columns={propertyColumns}
            data={paginated}
            getKey={(row) => row.id}
            getRowNumber={(_, i) => String((page - 1) * pageSize + i + 1).padStart(2, '0')}
            getRowStatus={() => 'active' as RowStatus}
            title="Properties"
            subtitle={`${filtered.length} propert${filtered.length !== 1 ? 'ies' : 'y'}`}
            headerRight={
              <Button icon={<Plus size={16} />} onClick={openAdd}>
                Add Property
              </Button>
            }
            emptyState={
              <p className="text-sm text-white/40">No properties found.</p>
            }
          />
          <Pagination
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </>
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
