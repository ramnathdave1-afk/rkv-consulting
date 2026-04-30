import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserOrg } from '@/lib/auth/get-user-org';

export async function GET(request: Request) {
  const { orgId } = await getUserOrg();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendor_id');
  const status = searchParams.get('status');

  let query = supabase
    .from('work_orders')
    .select(
      '*, properties(id, name, address_line1, city, state, zip), units(id, unit_number), tenants(id, first_name, last_name, phone, email), vendors(id, name, company, phone)'
    )
    .eq('org_id', orgId)
    .in('status', ['assigned', 'in_progress', 'parts_needed'])
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  if (status && status !== 'all') {
    // Override the default status filter when a specific status is requested
    query = supabase
      .from('work_orders')
      .select(
        '*, properties(id, name, address_line1, city, state, zip), units(id, unit_number), tenants(id, first_name, last_name, phone, email), vendors(id, name, company, phone)'
      )
      .eq('org_id', orgId)
      .eq('status', status)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also fetch vendors for the selector dropdown
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, company, phone')
    .eq('org_id', orgId)
    .order('name');

  // Compute KPI counts
  const { data: allWOs } = await supabase
    .from('work_orders')
    .select('status, completed_date')
    .eq('org_id', orgId)
    .in('status', ['assigned', 'in_progress', 'parts_needed', 'completed']);

  const today = new Date().toISOString().split('T')[0];
  const kpis = {
    assigned: 0,
    in_progress: 0,
    completed_today: 0,
  };

  (allWOs || []).forEach((wo: { status: string; completed_date: string | null }) => {
    if (wo.status === 'assigned') kpis.assigned++;
    if (wo.status === 'in_progress') kpis.in_progress++;
    if (wo.status === 'completed' && wo.completed_date && wo.completed_date.startsWith(today)) {
      kpis.completed_today++;
    }
  });

  return NextResponse.json({
    work_orders: data || [],
    vendors: vendors || [],
    kpis,
  });
}
