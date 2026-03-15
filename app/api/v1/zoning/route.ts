import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess } from '../middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * GET /api/v1/zoning
 *
 * Look up zoning districts by location or attributes.
 *
 * Query params:
 *   lat          - Latitude (point lookup)
 *   lng          - Longitude (point lookup)
 *   state        - US state abbreviation
 *   jurisdiction - City/county name
 *   zone_code    - Zoning code (partial match)
 *   category     - Zone category (residential, commercial, industrial, etc.)
 *   limit        - Max results (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;
  const lat = params.get('lat');
  const lng = params.get('lng');
  const state = params.get('state');
  const jurisdiction = params.get('jurisdiction');
  const zoneCode = params.get('zone_code');
  const category = params.get('category');
  const limit = Math.min(parseInt(params.get('limit') || '20', 10), 100);

  // Point lookup via PostGIS function
  if (lat && lng) {
    const { data, error } = await supabase.rpc('find_zoning_at_point', {
      point_lng: parseFloat(lng),
      point_lat: parseFloat(lat),
    });

    if (error) return apiError(error.message, 500);
    return apiSuccess(data || []);
  }

  // Attribute query
  let query = supabase
    .from('zoning_districts')
    .select('id, jurisdiction, state, county, zone_code, zone_name, zone_category, permitted_uses, conditional_uses, max_building_height_ft, max_lot_coverage_pct, min_lot_size_sqft, front_setback_ft, side_setback_ft, rear_setback_ft, max_far', { count: 'exact' });

  if (state) query = query.eq('state', state.toUpperCase());
  if (jurisdiction) query = query.ilike('jurisdiction', `%${jurisdiction}%`);
  if (zoneCode) query = query.ilike('zone_code', `%${zoneCode}%`);
  if (category) query = query.eq('zone_category', category);

  query = query.limit(limit);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return apiSuccess(data, { total: count || 0 });
}
