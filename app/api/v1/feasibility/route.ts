import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess } from '../middleware';
import { analyzeFeasibility } from '@/lib/feasibility/analyzer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * POST /api/v1/feasibility
 *
 * Run AI feasibility analysis for a location and intended use.
 *
 * Body:
 *   lat       - Latitude (required)
 *   lng       - Longitude (required)
 *   vertical  - Intended use: data_center, solar, wind, ev_charging, industrial, residential, mixed_use
 *   acreage   - Site acreage (optional)
 *   capacity  - Target capacity in MW (optional)
 *
 * OR:
 *   parcel_id - Existing parcel ID
 *   vertical  - Intended use
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth.error) return auth.error;

  // Check write scope
  if (!auth.scopes.includes('write') && !auth.scopes.includes('admin')) {
    return apiError('Feasibility analysis requires write scope.', 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body.', 400);
  }

  const vertical = (body.vertical as string) || 'data_center';
  const validVerticals = ['data_center', 'solar', 'wind', 'ev_charging', 'industrial', 'residential', 'mixed_use'];
  if (!validVerticals.includes(vertical)) {
    return apiError(`Invalid vertical. Must be one of: ${validVerticals.join(', ')}`, 400);
  }

  let siteData: {
    id: string;
    name: string;
    state: string;
    county?: string;
    lat: number;
    lng: number;
    vertical?: string;
    target_capacity?: number;
    acreage?: number;
    zoning?: string;
    nearest_substation_id?: string;
    distance_to_substation_mi?: number;
  };

  if (body.parcel_id) {
    // Look up existing parcel
    const { data: parcel, error } = await supabase
      .from('parcels')
      .select('*')
      .eq('id', body.parcel_id)
      .single();

    if (error || !parcel) return apiError('Parcel not found.', 404);

    siteData = {
      id: parcel.id,
      name: parcel.address || `Parcel ${parcel.apn || parcel.id.slice(0, 8)}`,
      state: parcel.state,
      county: parcel.county,
      lat: parcel.lat,
      lng: parcel.lng,
      vertical,
      acreage: parcel.acreage,
      zoning: parcel.zoning,
    };
  } else if (body.lat && body.lng) {
    siteData = {
      id: crypto.randomUUID(),
      name: `Analysis at ${body.lat}, ${body.lng}`,
      state: (body.state as string) || 'Unknown',
      lat: body.lat as number,
      lng: body.lng as number,
      vertical,
      acreage: body.acreage as number | undefined,
      target_capacity: body.capacity as number | undefined,
    };
  } else {
    return apiError('Provide either parcel_id or lat/lng coordinates.', 400);
  }

  // Find nearest substation
  const { data: nearestSub } = await supabase
    .from('substations')
    .select('id, name, available_mw, lat, lng')
    .eq('state', siteData.state)
    .order('available_mw', { ascending: false })
    .limit(1);

  if (nearestSub?.[0]) {
    siteData.nearest_substation_id = nearestSub[0].id;
    // Approximate distance
    const R = 3959;
    const dLat = (nearestSub[0].lat - siteData.lat) * Math.PI / 180;
    const dLon = (nearestSub[0].lng - siteData.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(siteData.lat * Math.PI / 180) * Math.cos(nearestSub[0].lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    siteData.distance_to_substation_mi = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const result = await analyzeFeasibility(siteData);

  return apiSuccess(result);
}
