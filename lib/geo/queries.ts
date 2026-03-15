import { createAdminClient } from '@/lib/supabase/admin';

export async function findGoldenSites(
  lat: number,
  lng: number,
  radiusMiles: number = 25,
  minAcres: number = 40,
  minAvailableMw: number = 50,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('find_golden_sites', {
    center_lat: lat,
    center_lng: lng,
    radius_miles: radiusMiles,
    min_acres: minAcres,
    min_available_mw: minAvailableMw,
  });

  if (error) throw error;
  return data;
}

export async function findNearbySubstations(
  lat: number,
  lng: number,
  radiusMiles: number = 50,
  limit: number = 20,
) {
  const supabase = createAdminClient();

  // Use PostGIS ST_DWithin for spatial query
  const { data, error } = await supabase.rpc('find_nearby_substations', {
    center_lat: lat,
    center_lng: lng,
    radius_miles: radiusMiles,
    result_limit: limit,
  });

  if (error) {
    // Fallback: simple bounding box query if RPC not available
    const latDelta = radiusMiles / 69;
    const lngDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));

    const { data: fallbackData } = await supabase
      .from('substations')
      .select('*')
      .gte('lat', lat - latDelta)
      .lte('lat', lat + latDelta)
      .gte('lng', lng - lngDelta)
      .lte('lng', lng + lngDelta)
      .order('available_mw', { ascending: false })
      .limit(limit);

    return fallbackData;
  }

  return data;
}
