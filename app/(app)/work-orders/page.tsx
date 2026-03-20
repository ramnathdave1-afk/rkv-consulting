'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { Wrench, Plus } from 'lucide-react';

interface WorkOrderRow {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  properties: { name: string } | null;
  units: { unit_number: string } | null;
  tenants: { first_name: string; last_name: string } | null;
}

const priorityColors: Record<string, string> = {
  emergency: 'bg-red-500/10 text-red-500',
  high: 'bg-orange-500/10 text-orange-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  low: 'bg-green-500/10 text-green-500',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-500/10 text-red-500',
  assigned: 'bg-yellow-500/10 text-yellow-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  parts_needed: 'bg-purple-500/10 text-purple-500',
  completed: 'bg-green-500/10 text-green-500',
  closed: 'bg-gray-500/10 text-gray-500',
  cancelled: 'bg-gray-400/10 text-gray-400',
};

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (!profile) return;

      const { data } = await supabase
        .from('work_orders')
        .select('id, title, category, priority, status, created_at, properties(name), units(unit_number), tenants(first_name, last_name)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      setWorkOrders((data as WorkOrderRow[]) || []);
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
          <h1 className="font-display text-xl font-bold text-text-primary">Work Orders</h1>
          <p className="text-sm text-text-secondary">{workOrders.length} work orders</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} />
          New Work Order
        </button>
      </div>

      {workOrders.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Wrench size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No work orders</h3>
          <p className="text-sm text-text-secondary">Work orders will appear here when tenants submit maintenance requests.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Property / Unit</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Priority</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.id} className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{wo.title}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {wo.properties?.name || '—'}{wo.units ? ` / ${wo.units.unit_number}` : ''}
                  </td>
                  <td className="px-4 py-3 text-text-secondary capitalize">{wo.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${priorityColors[wo.priority] || ''}`}>
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[wo.status] || ''}`}>
                      {wo.status.replace('_', ' ')}
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
