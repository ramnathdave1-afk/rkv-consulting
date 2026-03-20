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

  // Get portfolio metrics
  const [{ data: units }, { data: leases }, { data: properties }] = await Promise.all([
    supabase.from('units').select('id, status, property_id').eq('org_id', profile.org_id),
    supabase.from('leases').select('monthly_rent').eq('org_id', profile.org_id).eq('status', 'active'),
    supabase.from('properties').select('id, zip, city, state, property_type').eq('org_id', profile.org_id),
  ]);

  const allUnits = units || [];
  const occupied = allUnits.filter((u) => u.status === 'occupied').length;
  const portfolioOccupancy = allUnits.length > 0 ? (occupied / allUnits.length) * 100 : 0;
  const portfolioAvgRent = (leases || []).length > 0
    ? (leases || []).reduce((s, l) => s + Number(l.monthly_rent), 0) / (leases || []).length
    : 0;

  // Get market benchmarks for relevant zip codes
  const zips = [...new Set((properties || []).map((p) => p.zip))];
  const { data: benchmarks } = await supabase
    .from('market_benchmarks')
    .select('*')
    .in('zip', zips)
    .order('collected_at', { ascending: false });

  // Aggregate market averages
  const marketData = benchmarks || [];
  const marketAvgRent = marketData.length > 0
    ? marketData.reduce((s, b) => s + Number(b.avg_rent || 0), 0) / marketData.length
    : null;
  const marketAvgOccupancy = marketData.length > 0
    ? marketData.reduce((s, b) => s + Number(b.avg_occupancy_rate || 0), 0) / marketData.length
    : null;

  return NextResponse.json({
    portfolio: {
      occupancy_rate: Math.round(portfolioOccupancy * 10) / 10,
      avg_rent: Math.round(portfolioAvgRent),
      total_units: allUnits.length,
      total_properties: (properties || []).length,
    },
    market: {
      avg_rent: marketAvgRent ? Math.round(marketAvgRent) : null,
      avg_occupancy: marketAvgOccupancy ? Math.round(marketAvgOccupancy * 10) / 10 : null,
      data_points: marketData.length,
      source: 'market_benchmarks',
    },
    comparison: {
      rent_vs_market: marketAvgRent ? Math.round(((portfolioAvgRent - marketAvgRent) / marketAvgRent) * 100 * 10) / 10 : null,
      occupancy_vs_market: marketAvgOccupancy ? Math.round((portfolioOccupancy - marketAvgOccupancy) * 10) / 10 : null,
    },
  });
}
