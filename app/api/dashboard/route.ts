import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createAdminClient();

  // Use the first org (demo)
  const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
  if (!org) return NextResponse.json({ error: 'No org found' }, { status: 404 });

  const orgId = org.id;
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

  // Recent work orders for the table
  const { data: recentWOs } = await supabase
    .from('work_orders')
    .select('id, title, status, priority, category, created_at, properties(name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Recent conversations
  const { data: recentConvos } = await supabase
    .from('conversations')
    .select('id, participant_name, channel, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    totalProperties: properties.length,
    totalUnits: units.length,
    occupiedUnits,
    occupancyRate,
    openWorkOrders: workOrders.length,
    expiringLeases30d: expiringLeases.length,
    monthlyRevenue,
    workOrdersByStatus,
    recentWorkOrders: recentWOs || [],
    recentConversations: recentConvos || [],
  });
}
