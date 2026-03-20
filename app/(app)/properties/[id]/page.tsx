'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Property, Unit } from '@/lib/types';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const [propRes, unitsRes] = await Promise.all([
        supabase.from('properties').select('*').eq('id', id).single(),
        supabase.from('units').select('*').eq('property_id', id).order('unit_number'),
      ]);

      if (propRes.data) setProperty(propRes.data as Property);
      setUnits((unitsRes.data as Unit[]) || []);
      setLoading(false);
    }
    fetch();
  }, [supabase, id]);

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
      <div className="flex items-center gap-3">
        <Link href="/properties" className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">{property.name}</h1>
          <p className="text-sm text-text-secondary">{property.address_line1}, {property.city}, {property.state} {property.zip}</p>
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
        </div>
        {units.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No units added yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Unit</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Floor Plan</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Bed/Bath</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rent</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{u.unit_number}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.floor_plan || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{u.bedrooms}bd / {u.bathrooms}ba</td>
                  <td className="px-4 py-3 text-text-secondary">{u.market_rent ? `$${Number(u.market_rent).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[u.status] || ''}`}>
                      {u.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
