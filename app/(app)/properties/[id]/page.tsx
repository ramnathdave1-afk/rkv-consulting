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
        <p className="text-slate-500">Property not found.</p>
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
    occupied: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    vacant: 'bg-red-50 text-red-700 border border-red-200',
    notice: 'bg-amber-50 text-amber-700 border border-amber-200',
    make_ready: 'bg-sky-50 text-sky-700 border border-sky-200',
    down: 'bg-slate-100 text-slate-700 border border-slate-200',
    model: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/properties" className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft size={18} className="text-slate-500" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#020617]">{property.name}</h1>
            <p className="text-sm text-slate-500 mt-1">{property.address_line1}, {property.city}, {property.state} {property.zip}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
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
          <div key={item.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</p>
            <p className="font-display text-lg font-bold text-[#020617] capitalize tabular-nums mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Units Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[#020617]">Units ({units.length})</h3>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingUnit(null); setUnitFormOpen(true); }}>
            Add Unit
          </Button>
        </div>
        {units.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={36} className="mx-auto text-slate-400 mb-3" />
            <p className="text-sm text-slate-500">No units added yet. Add your first unit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left bg-slate-50">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Floor Plan</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bed/Bath</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rent</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#020617]">{u.unit_number}</td>
                    <td className="px-4 py-3 text-slate-500">{u.floor_plan || '\u2014'}</td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">{u.bedrooms}bd / {u.bathrooms}ba</td>
                    <td className="px-4 py-3 text-[#020617] tabular-nums font-medium">{u.market_rent ? `$${Number(u.market_rent).toLocaleString()}` : '\u2014'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[u.status] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                        {u.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingUnit(u); setUnitFormOpen(true); }} className="p-1.5 rounded-md text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteUnitId(u.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Market Rent Comps */}
      {property.city && property.state && property.zip && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-sky-700" />
            <h3 className="font-display text-xs font-semibold text-[#020617] uppercase tracking-wider">Market Rent Comps</h3>
            <span className="ml-auto text-xs text-slate-500">
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
              <p className="text-xs text-red-600">{rentalError}</p>
            </div>
          ) : rentalData ? (
            <div className="space-y-4">
              {/* Rent summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Median Rent', value: rentalData.medianRent },
                  { label: 'Avg Rent', value: rentalData.avgRent },
                  { label: 'Low', value: rentalData.lowRent },
                  { label: 'High', value: rentalData.highRent },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="font-display text-lg font-bold text-[#020617] tabular-nums mt-1">
                      {item.value !== null ? `$${item.value.toLocaleString()}` : '—'}
                    </p>
                    <p className="text-[10px] text-slate-500">/month</p>
                  </div>
                ))}
              </div>

              {/* Rental comps list */}
              {rentalData.rentals.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                    <h4 className="font-display text-xs font-semibold text-[#020617]">Comparable Rentals ({rentalData.rentals.length})</h4>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {rentalData.rentals.map((rental, i) => (
                      <div key={i} className="px-4 py-2.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-[#020617] truncate">{rental.address}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              {rental.bedrooms !== null && (
                                <span className="text-[10px] text-slate-500">{rental.bedrooms} bd</span>
                              )}
                              {rental.bathrooms !== null && (
                                <span className="text-[10px] text-slate-500">{rental.bathrooms} ba</span>
                              )}
                              {rental.sqft !== null && (
                                <span className="text-[10px] text-slate-500">{rental.sqft.toLocaleString()} sqft</span>
                              )}
                              <span className="text-[10px] text-slate-500">{rental.source}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-semibold tabular-nums text-[#020617]">
                              {rental.rent !== null ? `$${rental.rent.toLocaleString()}` : '—'}
                            </span>
                            {rental.link && (
                              <a href={rental.link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-700 transition-colors">
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
