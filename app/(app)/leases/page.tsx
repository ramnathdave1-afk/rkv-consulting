'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileText, Plus } from 'lucide-react';

interface LeaseRow {
  id: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  status: string;
  units: { unit_number: string; properties: { name: string } | null } | null;
  tenants: { first_name: string; last_name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  active: 'bg-green-500/10 text-green-500',
  expired: 'bg-gray-500/10 text-gray-500',
  terminated: 'bg-red-500/10 text-red-500',
  renewed: 'bg-blue-500/10 text-blue-500',
};

export default function LeasesPage() {
  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data } = await supabase
        .from('leases')
        .select('id, lease_start, lease_end, monthly_rent, status, units(unit_number, properties(name)), tenants(first_name, last_name)')
        .eq('org_id', profile.org_id)
        .order('lease_end', { ascending: true });

      setLeases((data as LeaseRow[]) || []);
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
          <h1 className="font-display text-xl font-bold text-text-primary">Leases</h1>
          <p className="text-sm text-text-secondary">{leases.length} leases</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} />
          New Lease
        </button>
      </div>

      {leases.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FileText size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No leases yet</h3>
          <p className="text-sm text-text-secondary">Create a lease after adding properties, units, and tenants.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Tenant</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property / Unit</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Rent</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Lease End</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {l.units?.properties?.name || '—'} / {l.units?.unit_number || '—'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">${Number(l.monthly_rent).toLocaleString()}/mo</td>
                  <td className="px-4 py-3 text-text-secondary">{l.lease_end}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[l.status] || ''}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
