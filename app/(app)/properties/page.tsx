'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Building2, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Property } from '@/lib/types';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
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
    }
    fetch();
  }, [supabase]);

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
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} />
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Building2 size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No properties yet</h3>
          <p className="text-sm text-text-secondary">Add your first property or connect a PM platform to import.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Address</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Units</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
