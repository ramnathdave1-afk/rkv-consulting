'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PropertyFormModal } from '@/components/properties/PropertyFormModal';
import { UnitFormModal } from '@/components/units/UnitFormModal';
import { ArrowLeft, Pencil, Trash2, Plus, Building2, TrendingUp, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import toast from 'react-hot-toast';
import type { Property, Unit } from '@/lib/types';

// ── Rental data types for Market Rent Comps ──
interface RentalComp {
  address: string;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  source: string;
  link: string;
}

interface RentalData {
  rentals: RentalComp[];
  medianRent: number | null;
  avgRent: number | null;
  lowRent: number | null;
  highRent: number | null;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [rentalData, setRentalData] = useState<RentalData | null>(null);
  const [rentalLoading, setRentalLoading] = useState(false);
  const [rentalError, setRentalError] = useState<string | null>(null);

  const fetchProperty = useCallback(async () => {
    const [propRes, unitsRes] = await Promise.all([
      supabase.from('properties').select('*').eq('id', id).single(),
      supabase.from('units').select('*').eq('property_id', id).order('unit_number'),
    ]);

    if (propRes.data) setProperty(propRes.data as Property);
    setUnits((unitsRes.data as Unit[]) || []);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  // Fetch rental comps when property loads
  useEffect(() => {
    if (!property?.city || !property?.state || !property?.zip) return;
    setRentalLoading(true);
    setRentalError(null);
    fetch(`/api/market/rentals?city=${encodeURIComponent(property.city)}&state=${encodeURIComponent(property.state)}&zip=${encodeURIComponent(property.zip)}`)
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch rental data'); return r.json(); })
      .then((d) => setRentalData(d))
      .catch((e) => setRentalError(e.message))
      .finally(() => setRentalLoading(false));
  }, [property?.city, property?.state, property?.zip]);

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      toast.success('Property deleted');
      router.push('/properties');
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
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <p className="text-text-secondary">Property not found.</p>
      </div>
    );
  }

  async function handleDeleteUnit() {
    if (!deleteUnitId) return;
    const res = await fetch(`/api/units/${deleteUnitId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Unit deleted');
      fetchProperty();
    } else {
      toast.error('Failed to delete unit');
    }
    setDeleteUnitId(null);
  }

  const occupied = units.filter((u) => u.status === 'occupied').length;
  const occupancy = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0;

  const statusColors: Record<string, string> = {
    occupied: 'bg-green-500/10 text-green-500',
    vacant: 'bg-red-500/10 text-red-500',
    notice: 'bg-yellow-500/10 text-yellow-500',
    make_ready: 'bg-blue-500/10 text-blue-500',
    down: 'bg-gray-500/10 text-gray-500',
    model: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/properties" className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">{property.name}</h1>
            <p className="text-sm text-text-secondary">{property.address_line1}, {property.city}, {property.state} {property.zip}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Property Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Type', value: property.property_type.replace('_', ' ') },
          { label: 'Units', value: units.length },
          { label: 'Occupancy', value: `${occupancy}%` },
          { label: 'Year Built', value: property.year_built || 'N/A' },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{item.label}</p>
            <p className="text-lg font-bold text-text-primary capitalize">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Units Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-primary">Units ({units.length})</h3>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingUnit(null); setUnitFormOpen(true); }}>
            Add Unit
          </Button>
        </div>
        {units.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={36} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-muted">No units added yet. Add your first unit.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Unit</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Floor Plan</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Bed/Bath</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rent</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{u.unit_number}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.floor_plan || '\u2014'}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.bedrooms}bd / {u.bathrooms}ba</td>
                  <td className="px-4 py-3 text-text-secondary">{u.market_rent ? `$${Number(u.market_rent).toLocaleString()}` : '\u2014'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[u.status] || ''}`}>
                      {u.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingUnit(u); setUnitFormOpen(true); }} className="p-1.5 rounded-md hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteUnitId(u.id)} className="p-1.5 rounded-md hover:bg-danger-muted text-text-muted hover:text-danger transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Market Rent Comps */}
      {property.city && property.state && property.zip && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-[#00D4AA]" />
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">Market Rent Comps</h3>
            <span className="ml-auto text-[10px] text-text-muted">
              {property.city}, {property.state} {property.zip}
            </span>
          </div>

          {rentalLoading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
              <Skeleton className="h-40" />
            </div>
          ) : rentalError ? (
            <div className="text-center py-6">
              <p className="text-xs text-red-400">{rentalError}</p>
            </div>
          ) : rentalData ? (
            <div className="space-y-4">
              {/* Rent summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Median Rent', value: rentalData.medianRent, color: '#00D4AA' },
                  { label: 'Avg Rent', value: rentalData.avgRent, color: '#3B82F6' },
                  { label: 'Low', value: rentalData.lowRent, color: '#F59E0B' },
                  { label: 'High', value: rentalData.highRent, color: '#8B5CF6' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-bg-primary border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">{item.label}</p>
                    <p className="text-lg font-bold text-text-primary">
                      {item.value !== null ? `$${item.value.toLocaleString()}` : '--'}
                    </p>
                    <p className="text-[10px] text-text-muted">/month</p>
                  </div>
                ))}
              </div>

              {/* Rental comps list */}
              {rentalData.rentals.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-bg-primary">
                    <h4 className="text-xs font-medium text-text-primary">Comparable Rentals ({rentalData.rentals.length})</h4>
                  </div>
                  <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                    {rentalData.rentals.map((rental, i) => (
                      <div key={i} className="px-4 py-2.5 hover:bg-bg-elevated/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-text-primary truncate">{rental.address}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {rental.bedrooms !== null && (
                                <span className="text-[10px] text-text-muted">{rental.bedrooms} bd</span>
                              )}
                              {rental.bathrooms !== null && (
                                <span className="text-[10px] text-text-muted">{rental.bathrooms} ba</span>
                              )}
                              {rental.sqft !== null && (
                                <span className="text-[10px] text-text-muted">{rental.sqft.toLocaleString()} sqft</span>
                              )}
                              <span className="text-[10px] text-text-muted">{rental.source}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-bold text-[#00D4AA]">
                              {rental.rent !== null ? `$${rental.rent.toLocaleString()}` : '--'}
                            </span>
                            {rental.link && (
                              <a href={rental.link} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text-primary transition-colors">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      )}

      <UnitFormModal
        open={unitFormOpen}
        onOpenChange={setUnitFormOpen}
        propertyId={id}
        unit={editingUnit}
        onSuccess={fetchProperty}
      />

      <ConfirmDialog
        open={!!deleteUnitId}
        onOpenChange={(open) => { if (!open) setDeleteUnitId(null); }}
        title="Delete Unit"
        description="This will permanently delete this unit and any associated lease data."
        onConfirm={handleDeleteUnit}
        confirmLabel="Delete"
        variant="danger"
      />

      <PropertyFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        property={property}
        onSuccess={fetchProperty}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Property"
        description={`Are you sure you want to delete "${property.name}"? This action cannot be undone and will remove all associated units, leases, and work orders.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
