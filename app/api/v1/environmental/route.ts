import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess } from '../middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * GET /api/v1/environmental
 *
 * Check environmental constraints for a location.
 *
 * Query params:
 *   lat         - Latitude
 *   lng         - Longitude
 *   state       - US state abbreviation
 *   layer_type  - Filter by type (flood_zone, wetland, contaminated, protected)
 *   severity    - Filter by severity (high, moderate, low, minimal)
 *   limit       - Max results (default 50, max 200)
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;
  const state = params.get('state');
  const layerType = params.get('layer_type');
  const severity = params.get('severity');
  const limit = Math.min(parseInt(params.get('limit') || '50', 10), 200);

  let query = supabase
    .from('environmental_layers')
    .select('id, layer_type, severity, designation, name, description, state, source_agency, area_acres, restrictions, mitigation_required, mitigation_details, created_at', { count: 'exact' });

  if (state) query = query.eq('state', state.toUpperCase());
  if (layerType) query = query.eq('layer_type', layerType);
  if (severity) query = query.eq('severity', severity);

  query = query
    .order('severity', { ascending: true })
    .limit(limit);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return apiSuccess(data, { total: count || 0 });
}
