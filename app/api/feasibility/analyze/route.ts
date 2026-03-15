import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeFeasibility } from '@/lib/feasibility/analyzer';

/**
 * POST /api/feasibility/analyze
 *
 * Internal route for the feasibility UI. Requires authentication.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { lat, lng, state, vertical, acreage, capacity } = body;

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  // Find nearest substation
  const { data: nearestSub } = await supabase
    .from('substations')
    .select('id, name, available_mw, lat, lng')
    .eq('state', state || 'AZ')
    .order('available_mw', { ascending: false })
    .limit(1);

  let nearestSubId: string | undefined;
  let distanceToSub: number | undefined;

  if (nearestSub?.[0]) {
    nearestSubId = nearestSub[0].id;
    const R = 3959;
    const dLat = (nearestSub[0].lat - lat) * Math.PI / 180;
    const dLon = (nearestSub[0].lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat * Math.PI / 180) * Math.cos(nearestSub[0].lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    distanceToSub = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const result = await analyzeFeasibility({
    id: crypto.randomUUID(),
    name: `Analysis at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    state: state || 'AZ',
    lat,
    lng,
    vertical: vertical || 'data_center',
    acreage: acreage || undefined,
    target_capacity: capacity || undefined,
    nearest_substation_id: nearestSubId,
    distance_to_substation_mi: distanceToSub,
  });

  return NextResponse.json(result);
}
