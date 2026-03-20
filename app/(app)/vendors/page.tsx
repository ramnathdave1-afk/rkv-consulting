'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { HardHat, Plus, Star } from 'lucide-react';
import type { Vendor } from '@/lib/types';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
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
          <h1 className="font-display text-xl font-bold text-text-primary">Vendors</h1>
          <p className="text-sm text-text-secondary">{vendors.length} vendors</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <HardHat size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No vendors yet</h3>
          <p className="text-sm text-text-secondary">Add your maintenance vendors for automatic dispatch.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Company</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Specialties</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rate</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rating</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {v.name}
                    {v.is_preferred && <span className="ml-1.5 text-yellow-500"><Star size={12} className="inline" /></span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{v.company || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(v.specialty || []).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-accent/10 text-accent capitalize">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{v.hourly_rate ? `$${v.hourly_rate}/hr` : '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{v.rating ? `${v.rating}/5` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
