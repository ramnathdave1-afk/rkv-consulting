'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KPICard } from '@/components/dashboard/KPICard';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Building2,
  DoorOpen,
  Percent,
  Wrench,
  FileText,
  DollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardData {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  openWorkOrders: number;
  expiringLeases30d: number;
  monthlyRevenue: number;
  workOrdersByStatus: Record<string, number>;
}

const WO_STATUS_COLORS: Record<string, string> = {
  open: '#EF4444',
  assigned: '#F59E0B',
  in_progress: '#3B82F6',
  parts_needed: '#8B5CF6',
  completed: '#22C55E',
  closed: '#6B7280',
  cancelled: '#9CA3AF',
};

function generateSparkline(current: number, variance = 0.15): number[] {
  const points: number[] = [];
  for (let i = 0; i < 12; i++) {
    const factor = 0.7 + (i / 12) * 0.3 + (Math.random() - 0.5) * variance;
    points.push(Math.round(current * factor));
  }
  points.push(current);
  return points;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchDashboard = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return;

    const orgId = profile.org_id;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [propertiesRes, unitsRes, workOrdersRes, leasesRes, activeLeasesRes] = await Promise.all([
      supabase.from('properties').select('id').eq('org_id', orgId),
      supabase.from('units').select('id, status').eq('org_id', orgId),
      supabase.from('work_orders').select('status').eq('org_id', orgId).not('status', 'in', '("closed","cancelled")'),
      supabase.from('leases').select('id, lease_end').eq('org_id', orgId).eq('status', 'active').lte('lease_end', in30Days),
      supabase.from('leases').select('monthly_rent').eq('org_id', orgId).eq('status', 'active'),
    ]);

    const properties = propertiesRes.data || [];
    const units = unitsRes.data || [];
    const workOrders = workOrdersRes.data || [];
    const expiringLeases = leasesRes.data || [];
    const activeLeases = activeLeasesRes.data || [];

    const occupiedUnits = units.filter((u: { status: string }) => u.status === 'occupied').length;
    const occupancyRate = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;
    const monthlyRevenue = activeLeases.reduce((sum: number, l: { monthly_rent: number }) => sum + (l.monthly_rent || 0), 0);

    const workOrdersByStatus: Record<string, number> = {};
    workOrders.forEach((wo: { status: string }) => {
      workOrdersByStatus[wo.status] = (workOrdersByStatus[wo.status] || 0) + 1;
    });

    setData({
      totalProperties: properties.length,
      totalUnits: units.length,
      occupiedUnits,
      occupancyRate,
      openWorkOrders: workOrders.length,
      expiringLeases30d: expiringLeases.length,
      monthlyRevenue,
      workOrdersByStatus,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchDashboard();

    const channel = supabase
      .channel('pm-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => fetchDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => fetchDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => fetchDashboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, () => fetchDashboard())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { title: 'Properties', numericValue: data.totalProperties, value: data.totalProperties, icon: Building2, color: '#00D4AA', sparklineData: generateSparkline(data.totalProperties) },
    { title: 'Total Units', numericValue: data.totalUnits, value: data.totalUnits, icon: DoorOpen, color: '#3B82F6', sparklineData: generateSparkline(data.totalUnits) },
    { title: 'Occupancy Rate', numericValue: data.occupancyRate, value: `${data.occupancyRate}%`, icon: Percent, color: '#22C55E', sparklineData: generateSparkline(data.occupancyRate, 0.1) },
    { title: 'Open Work Orders', numericValue: data.openWorkOrders, value: data.openWorkOrders, icon: Wrench, color: '#F59E0B', sparklineData: generateSparkline(data.openWorkOrders, 0.3) },
    { title: 'Leases Expiring (30d)', numericValue: data.expiringLeases30d, value: data.expiringLeases30d, icon: FileText, color: '#EF4444', sparklineData: generateSparkline(data.expiringLeases30d, 0.4) },
    { title: 'Monthly Revenue', numericValue: data.monthlyRevenue, value: `$${data.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: '#8A00FF', sparklineData: generateSparkline(data.monthlyRevenue) },
  ];

  const totalWO = Object.values(data.workOrdersByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">Property management overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, i) => (
          <KPICard key={kpi.title} {...kpi} index={i} />
        ))}
      </div>

      {/* Work Order Status Distribution */}
      {totalWO > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.36 }}
          className="glass-card p-4"
        >
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Work Order Status</h3>
          <div className="flex gap-2 h-8">
            {Object.entries(data.workOrdersByStatus).map(([status, count]) => {
              const pct = (count / totalWO) * 100;
              return (
                <motion.div
                  key={status}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 8)}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-md flex items-center justify-center text-[10px] font-semibold text-white"
                  style={{ backgroundColor: WO_STATUS_COLORS[status] || '#6B7280' }}
                  title={`${status}: ${count}`}
                >
                  {count}
                </motion.div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {Object.entries(WO_STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-text-muted capitalize">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {data.totalProperties === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="glass-card p-8 text-center"
        >
          <Building2 size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">Welcome to MeridianNode</h3>
          <p className="text-sm text-text-secondary mb-4">
            Get started by adding your first property, or connect your PM platform to import data automatically.
          </p>
          <div className="flex justify-center gap-3">
            <a href="/properties" className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
              Add Property
            </a>
            <a href="/integrations" className="px-4 py-2 rounded-lg border border-border text-text-primary text-sm font-medium hover:bg-bg-elevated transition-colors">
              Connect PM Platform
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
