'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { PropertyFormModal } from '@/components/properties/PropertyFormModal';
import { Building2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { Property } from '@/lib/types';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
    if (!profile) return;

    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    setProperties((data as Property[]) || []);
    setLoading(false);
  }, [supabase]);

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
        <div className="glass-card overflow-hidden">
          <ResponsiveTable minWidth="640px">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Address</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Units</th>
                  <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/properties/${p.id}`} className="text-accent hover:underline font-medium">{p.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{p.address_line1}, {p.city}, {p.state} {p.zip}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent capitalize">
                        {p.property_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{p.unit_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                          title="Edit property"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => openDelete(p)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-muted transition-colors"
                          title="Delete property"
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
