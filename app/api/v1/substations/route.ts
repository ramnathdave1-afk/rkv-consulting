import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess } from '../middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * GET /api/v1/substations
 *
 * Query substations with capacity and location filters.
 *
 * Query params:
 *   state        - US state abbreviation
 *   iso_region   - ISO region (PJM, MISO, ERCOT, CAISO, etc.)
 *   min_capacity - Minimum total capacity MW
 *   min_available - Minimum available MW
 *   bbox         - Bounding box: west,south,east,north
 *   limit        - Max results (default 50, max 500)
 *   offset       - Pagination offset
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;
  const state = params.get('state');
  const isoRegion = params.get('iso_region');
  const minCapacity = params.get('min_capacity');
  const minAvailable = params.get('min_available');
  const bbox = params.get('bbox');
  const limit = Math.min(parseInt(params.get('limit') || '50', 10), 500);
  const offset = parseInt(params.get('offset') || '0', 10);

  let query = supabase
    .from('substations')
    .select('id, name, lat, lng, state, county, voltage_kv, capacity_mw, available_mw, iso_zone, iso_region, owner, status, created_at', { count: 'exact' });

  if (state) query = query.eq('state', state.toUpperCase());
  if (isoRegion) query = query.eq('iso_region', isoRegion);
  if (minCapacity) query = query.gte('capacity_mw', parseFloat(minCapacity));
  if (minAvailable) query = query.gte('available_mw', parseFloat(minAvailable));

  if (bbox) {
    const [west, south, east, north] = bbox.split(',').map(Number);
    if ([west, south, east, north].every((n) => !isNaN(n))) {
      query = query.gte('lat', south).lte('lat', north).gte('lng', west).lte('lng', east);
    }
  }

  query = query
    .order('available_mw', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return apiSuccess(data, { total: count || 0, offset, limit });
}
