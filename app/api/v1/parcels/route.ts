import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess } from '../middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * GET /api/v1/parcels
 *
 * Query parcels with spatial and attribute filters.
 *
 * Query params:
 *   state     - US state abbreviation (e.g., AZ)
 *   county    - County name
 *   zoning    - Zoning code filter (partial match)
 *   min_acres - Minimum acreage
 *   max_acres - Maximum acreage
 *   bbox      - Bounding box: west,south,east,north
 *   limit     - Max results (default 50, max 500)
 *   offset    - Pagination offset
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;
  const state = params.get('state');
  const county = params.get('county');
  const zoning = params.get('zoning');
  const minAcres = params.get('min_acres');
  const maxAcres = params.get('max_acres');
  const bbox = params.get('bbox');
  const limit = Math.min(parseInt(params.get('limit') || '50', 10), 500);
  const offset = parseInt(params.get('offset') || '0', 10);

  let query = supabase
    .from('parcels')
    .select('id, apn, address, acreage, zoning, owner, state, county, lat, lng, fips_code, assessed_value, market_value, flood_zone, land_use_desc, updated_at', { count: 'exact' });

  if (state) query = query.eq('state', state.toUpperCase());
  if (county) query = query.ilike('county', `%${county}%`);
  if (zoning) query = query.ilike('zoning', `%${zoning}%`);
  if (minAcres) query = query.gte('acreage', parseFloat(minAcres));
  if (maxAcres) query = query.lte('acreage', parseFloat(maxAcres));

  // Bounding box filter via PostGIS
  if (bbox) {
    const [west, south, east, north] = bbox.split(',').map(Number);
    if ([west, south, east, north].every((n) => !isNaN(n))) {
      query = query
        .gte('lat', south)
        .lte('lat', north)
        .gte('lng', west)
        .lte('lng', east);
    }
  }

  query = query
    .order('acreage', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return apiError(error.message, 500);

  return apiSuccess(data, { total: count || 0, offset, limit });
}
