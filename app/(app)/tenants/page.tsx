'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Users, Plus } from 'lucide-react';
import type { Tenant } from '@/lib/types';

const statusColors: Record<string, string> = {
  prospect: 'bg-blue-500/10 text-blue-500',
  applicant: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  active: 'bg-green-500/10 text-green-500',
  notice: 'bg-orange-500/10 text-orange-500',
  past: 'bg-gray-500/10 text-gray-500',
  denied: 'bg-red-500/10 text-red-500',
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      setTenants((data as Tenant[]) || []);
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
          <h1 className="font-display text-xl font-bold text-text-primary">Tenants</h1>
          <p className="text-sm text-text-secondary">{tenants.length} tenants & prospects</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} />
          Add Tenant
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Users size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No tenants yet</h3>
          <p className="text-sm text-text-secondary">Add tenants manually or sync from your PM platform.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Phone</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{t.first_name} {t.last_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.email || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{t.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[t.status] || ''}`}>
                      {t.status}
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
