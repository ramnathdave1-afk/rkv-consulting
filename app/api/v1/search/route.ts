import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess } from '../middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * GET /api/v1/search
 *
 * Unified search across parcels, substations, and sites.
 *
 * Query params:
 *   q      - Search query (name, address, APN)
 *   type   - Filter: parcel, substation, site, all (default: all)
 *   state  - US state abbreviation
 *   bbox   - Bounding box: west,south,east,north
 *   limit  - Max results per type (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (auth.error) return auth.error;

  const params = request.nextUrl.searchParams;
  const q = params.get('q') || '';
  const type = params.get('type') || 'all';
  const state = params.get('state');
  const limit = Math.min(parseInt(params.get('limit') || '10', 10), 50);

  if (!q.trim()) {
    return apiError('Query parameter q is required.', 400);
  }

  const results: Array<{
    id: string;
    type: string;
    name: string;
    subtitle: string;
    lat: number | null;
    lng: number | null;
    state: string;
  }> = [];

  // Search parcels
  if (type === 'all' || type === 'parcel') {
    let parcelQuery = supabase
      .from('parcels')
      .select('id, apn, address, acreage, zoning, state, county, lat, lng')
      .limit(limit);

    parcelQuery = parcelQuery.or(`address.ilike.%${q}%,apn.ilike.%${q}%,owner.ilike.%${q}%`);
    if (state) parcelQuery = parcelQuery.eq('state', state.toUpperCase());

    const { data: parcels } = await parcelQuery;
    for (const p of parcels || []) {
      results.push({
        id: p.id,
        type: 'parcel',
        name: p.address || `APN: ${p.apn}`,
        subtitle: `${p.state} · ${p.county} · ${p.acreage || '?'} acres · ${p.zoning || 'No zoning'}`,
        lat: p.lat,
        lng: p.lng,
        state: p.state,
      });
    }
  }

  // Search substations
  if (type === 'all' || type === 'substation') {
    let subQuery = supabase
      .from('substations')
      .select('id, name, state, capacity_mw, available_mw, lat, lng')
      .ilike('name', `%${q}%`)
      .limit(limit);

    if (state) subQuery = subQuery.eq('state', state.toUpperCase());

    const { data: subs } = await subQuery;
    for (const s of subs || []) {
      results.push({
        id: s.id,
        type: 'substation',
        name: s.name,
        subtitle: `${s.state} · ${s.available_mw || '?'}MW available / ${s.capacity_mw || '?'}MW total`,
        lat: s.lat,
        lng: s.lng,
        state: s.state,
      });
    }
  }

  // Search sites
  if (type === 'all' || type === 'site') {
    let siteQuery = supabase
      .from('sites')
      .select('id, name, state, county, target_capacity, pipeline_stage, lat, lng')
      .ilike('name', `%${q}%`)
      .limit(limit);

    if (state) siteQuery = siteQuery.eq('state', state.toUpperCase());

    const { data: sites } = await siteQuery;
    for (const s of sites || []) {
      results.push({
        id: s.id,
        type: 'site',
        name: s.name,
        subtitle: `${s.state} · ${s.target_capacity || '?'}MW · ${(s.pipeline_stage || '').replace('_', ' ')}`,
        lat: s.lat,
        lng: s.lng,
        state: s.state,
      });
    }
  }

  return apiSuccess(results, { total: results.length });
}
