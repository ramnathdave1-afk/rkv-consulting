import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const orgId = profile.org_id;
  const locationId = request.nextUrl.searchParams.get('location_id') || null;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Scope: when location_id is provided, derive the relevant property_ids
  // and use them to filter every dependent table.
  let scopedPropertyIds: string[] | null = null;
  if (locationId) {
    const { data: scopedProps } = await supabase
      .from('properties')
      .select('id')
      .eq('org_id', orgId)
      .eq('location_id', locationId);
    scopedPropertyIds = (scopedProps || []).map((p: { id: string }) => p.id);
    if (scopedPropertyIds.length === 0) {
      return NextResponse.json({
        totalProperties: 0,
        totalUnits: 0,
        occupiedUnits: 0,
        occupancyRate: 0,
        openWorkOrders: 0,
        expiringLeases30d: 0,
        monthlyRevenue: 0,
        workOrdersByStatus: {},
        recentWorkOrders: [],
        recentConversations: [],
      });
    }
  }

  const propertiesQ = supabase.from('properties').select('id').eq('org_id', orgId);
  const unitsQ = supabase.from('units').select('id, status').eq('org_id', orgId);
  const workOrdersQ = supabase
    .from('work_orders')
    .select('status')
    .eq('org_id', orgId)
    .not('status', 'in', '("closed","cancelled")');
  const expiringLeasesQ = supabase
    .from('leases')
    .select('id, lease_end')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .lte('lease_end', in30Days);
  const activeLeasesQ = supabase
    .from('leases')
    .select('monthly_rent')
    .eq('org_id', orgId)
    .eq('status', 'active');

  if (locationId && scopedPropertyIds) {
    propertiesQ.eq('location_id', locationId);
    unitsQ.in('property_id', scopedPropertyIds);
    workOrdersQ.in('property_id', scopedPropertyIds);
    expiringLeasesQ.in('property_id', scopedPropertyIds);
    activeLeasesQ.in('property_id', scopedPropertyIds);
  }

  const [propertiesRes, unitsRes, workOrdersRes, leasesRes, activeLeasesRes] = await Promise.all([
    propertiesQ,
    unitsQ,
    workOrdersQ,
    expiringLeasesQ,
    activeLeasesQ,
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

  const recentWOQ = supabase
    .from('work_orders')
    .select('id, title, status, priority, category, created_at, properties(name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (locationId && scopedPropertyIds) recentWOQ.in('property_id', scopedPropertyIds);
  const { data: recentWOs } = await recentWOQ;

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
