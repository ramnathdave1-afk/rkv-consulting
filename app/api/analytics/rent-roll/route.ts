import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id');

  let query = supabase
    .from('leases')
    .select(`
      id, monthly_rent, lease_start, lease_end, status, renewal_offered,
      tenants(first_name, last_name, email, phone),
      units(unit_number, bedrooms, bathrooms, square_footage, market_rent, properties(name))
    `)
    .eq('org_id', profile.org_id)
    .in('status', ['active', 'pending']);

  if (propertyId) {
    query = query.eq('units.property_id', propertyId);
  }

  const { data, error } = await query.order('units(unit_number)', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calculate summary
  const leases = data || [];
  const totalRent = leases.reduce((s, l) => s + Number(l.monthly_rent), 0);
  const avgRent = leases.length > 0 ? Math.round(totalRent / leases.length) : 0;

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const expiring30 = leases.filter((l) => l.lease_end <= in30Days).length;
  const expiring60 = leases.filter((l) => l.lease_end > in30Days && l.lease_end <= in60Days).length;
  const expiring90 = leases.filter((l) => l.lease_end > in60Days && l.lease_end <= in90Days).length;

  return NextResponse.json({
    rent_roll: leases,
    summary: {
      total_leases: leases.length,
      total_monthly_rent: totalRent,
      avg_rent: avgRent,
      expiring_30d: expiring30,
      expiring_60d: expiring60,
      expiring_90d: expiring90,
    },
  });
}
