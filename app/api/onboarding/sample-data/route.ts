import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST → loads demo properties/units/tenants/leases/work_orders for the user's org.
 * DELETE → removes anything tagged demo=true in metadata.
 *
 * All demo records are clearly labeled "Demo - …" and tagged in metadata
 * so the user can wipe them later.
 */

const DEMO_TAG = { demo: true };

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  }
  const org_id = profile.org_id;

  // 3 demo properties
  const propertyRows = [
    {
      org_id,
      name: 'Demo - Sunset Apartments',
      address_line1: '123 Sunset Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90028',
      property_type: 'multifamily',
      unit_count: 12,
      year_built: 2005,
      created_by: user.id,
      metadata: DEMO_TAG,
    },
    {
      org_id,
      name: 'Demo - Maple Court',
      address_line1: '456 Maple Ave',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      property_type: 'multifamily',
      unit_count: 8,
      year_built: 2012,
      created_by: user.id,
      metadata: DEMO_TAG,
    },
    {
      org_id,
      name: 'Demo - Harbor View',
      address_line1: '789 Harbor Dr',
      city: 'San Diego',
      state: 'CA',
      zip: '92101',
      property_type: 'mixed_use',
      unit_count: 6,
      year_built: 2018,
      created_by: user.id,
      metadata: DEMO_TAG,
    },
  ];

  const { data: properties, error: pErr } = await supabase
    .from('properties')
    .insert(propertyRows)
    .select('id, name');
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Build 5 units across the 3 properties
  const unitRows = [
    { property_id: properties![0].id, unit_number: '101', bedrooms: 1, bathrooms: 1, square_footage: 650, market_rent: 1850, status: 'occupied' },
    { property_id: properties![0].id, unit_number: '102', bedrooms: 2, bathrooms: 1, square_footage: 880, market_rent: 2400, status: 'occupied' },
    { property_id: properties![1].id, unit_number: 'A', bedrooms: 2, bathrooms: 2, square_footage: 1100, market_rent: 2200, status: 'occupied' },
    { property_id: properties![1].id, unit_number: 'B', bedrooms: 3, bathrooms: 2, square_footage: 1450, market_rent: 2800, status: 'vacant' },
    { property_id: properties![2].id, unit_number: '301', bedrooms: 1, bathrooms: 1, square_footage: 720, market_rent: 2600, status: 'occupied' },
  ].map((u) => ({ ...u, org_id, metadata: DEMO_TAG }));

  const { data: units, error: uErr } = await supabase
    .from('units')
    .insert(unitRows)
    .select('id, property_id, market_rent');
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  // 5 demo tenants
  const tenantRows = [
    { first_name: 'Demo', last_name: 'Smith', email: 'demo.smith@example.com', phone: '+15555550101', status: 'active' },
    { first_name: 'Demo', last_name: 'Johnson', email: 'demo.johnson@example.com', phone: '+15555550102', status: 'active' },
    { first_name: 'Demo', last_name: 'Garcia', email: 'demo.garcia@example.com', phone: '+15555550103', status: 'active' },
    { first_name: 'Demo', last_name: 'Lee', email: 'demo.lee@example.com', phone: '+15555550104', status: 'prospect' },
    { first_name: 'Demo', last_name: 'Williams', email: 'demo.williams@example.com', phone: '+15555550105', status: 'active' },
  ].map((t) => ({ ...t, org_id, metadata: DEMO_TAG }));

  const { data: tenants, error: tErr } = await supabase
    .from('tenants')
    .insert(tenantRows)
    .select('id');
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // 5 demo leases — pair tenants with the first 5 units
  const today = new Date();
  const yearAgo = new Date(today); yearAgo.setFullYear(today.getFullYear() - 1);
  const yearAhead = new Date(today); yearAhead.setMonth(today.getMonth() + 8);

  const leaseRows = tenants!.slice(0, 5).map((t, i) => ({
    org_id,
    unit_id: units![i].id,
    tenant_id: t.id,
    lease_start: yearAgo.toISOString().slice(0, 10),
    lease_end: yearAhead.toISOString().slice(0, 10),
    monthly_rent: units![i].market_rent || 2000,
    security_deposit: (units![i].market_rent || 2000),
    status: i === 3 ? 'pending' : 'active',
    terms: DEMO_TAG,
  }));

  const { error: lErr } = await supabase.from('leases').insert(leaseRows);
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  // A few demo work orders
  const workOrderRows = [
    {
      org_id,
      property_id: properties![0].id,
      unit_id: units![0].id,
      tenant_id: tenants![0].id,
      title: 'Demo - Leaky kitchen faucet',
      description: 'Tenant reports a steady drip from the kitchen faucet.',
      category: 'plumbing',
      priority: 'medium',
      status: 'open',
      source: 'tenant_portal',
      created_by: user.id,
      metadata: DEMO_TAG,
    },
    {
      org_id,
      property_id: properties![1].id,
      unit_id: units![2].id,
      tenant_id: tenants![2].id,
      title: 'Demo - HVAC not cooling',
      description: 'AC running but no cold air. High-priority for summer.',
      category: 'hvac',
      priority: 'high',
      status: 'assigned',
      source: 'ai_chat',
      created_by: user.id,
      metadata: DEMO_TAG,
    },
    {
      org_id,
      property_id: properties![2].id,
      title: 'Demo - Common area lighting',
      description: 'Lobby light fixture needs replacement.',
      category: 'electrical',
      priority: 'low',
      status: 'open',
      source: 'manual',
      created_by: user.id,
      metadata: DEMO_TAG,
    },
  ];

  const { error: wErr } = await supabase.from('work_orders').insert(workOrderRows);
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    counts: { properties: 3, units: 5, tenants: 5, leases: 5, work_orders: 3 },
  });
}

export async function DELETE(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 });
  }
  const org_id = profile.org_id;

  // Delete in order (FK cascade will help, but be explicit)
  await supabase.from('work_orders').delete().eq('org_id', org_id).contains('metadata', DEMO_TAG);
  await supabase.from('leases').delete().eq('org_id', org_id).contains('terms', DEMO_TAG);
  await supabase.from('tenants').delete().eq('org_id', org_id).contains('metadata', DEMO_TAG);
  await supabase.from('units').delete().eq('org_id', org_id).contains('metadata', DEMO_TAG);
  await supabase.from('properties').delete().eq('org_id', org_id).contains('metadata', DEMO_TAG);

  return NextResponse.json({ success: true });
}
