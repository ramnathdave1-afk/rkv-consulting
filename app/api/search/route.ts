import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callClaude } from '@/lib/ai/claude';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ results: [] });
  }

  // Use Claude to extract structured filters from NLP query
  const nlpResponse = await callClaude(
    [{ role: 'user', content: q }],
    `You are a search query parser for a multi-vertical land infrastructure intelligence platform covering data centers, solar, wind, EV charging, industrial, residential, and mixed-use development.

Extract structured filters from the user query. Return JSON only with these optional fields:
- search_text: string (name/location text to search)
- state: string (US state abbreviation)
- min_capacity: number (MW)
- max_capacity: number
- min_score: number (0-100 composite score)
- min_acreage: number
- max_acreage: number
- pipeline_stage: string (prospect|due_diligence|loi|under_contract|closed)
- vertical: string (data_center|solar|wind|ev_charging|industrial|residential|mixed_use)
- type: string (site|substation|parcel|all)
- zoning: string (zoning code filter)
- iso_region: string (PJM|MISO|ERCOT|CAISO|ISO-NE|NYISO|SPP|WECC)

Return ONLY valid JSON, no markdown.`
  );

  let filters: Record<string, unknown> = {};
  try {
    const content = nlpResponse?.content?.[0]?.text || '{}';
    filters = JSON.parse(content);
  } catch {
    filters = { search_text: q };
  }

  const results: Array<{ id: string; type: string; name: string; subtitle: string; score?: number }> = [];

  // Search sites
  if (!filters.type || filters.type === 'site' || filters.type === 'all') {
    let siteQuery = supabase
      .from('sites')
      .select('id, name, state, county, pipeline_stage, target_capacity, acreage, vertical')
      .eq('org_id', profile.org_id)
      .limit(10);

    if (filters.search_text) siteQuery = siteQuery.ilike('name', `%${filters.search_text}%`);
    if (filters.state) siteQuery = siteQuery.eq('state', filters.state);
    if (filters.min_capacity) siteQuery = siteQuery.gte('target_capacity', filters.min_capacity);
    if (filters.min_acreage) siteQuery = siteQuery.gte('acreage', filters.min_acreage);
    if (filters.pipeline_stage) siteQuery = siteQuery.eq('pipeline_stage', filters.pipeline_stage);
    if (filters.vertical) siteQuery = siteQuery.eq('vertical', filters.vertical);

    const { data: sites } = await siteQuery;
    if (sites) {
      for (const s of sites) {
        const verticalLabel = (s.vertical || 'data_center').replace('_', ' ');
        results.push({
          id: s.id,
          type: 'site',
          name: s.name,
          subtitle: `${s.state}${s.county ? ` · ${s.county}` : ''} · ${s.target_capacity || '?'}MW · ${verticalLabel} · ${(s.pipeline_stage || '').replace('_', ' ')}`,
        });
      }
    }
  }

  // Search substations
  if (!filters.type || filters.type === 'substation' || filters.type === 'all') {
    let subQuery = supabase
      .from('substations')
      .select('id, name, state, capacity_mw, available_mw, utility, iso_region')
      .limit(10);

    if (filters.search_text) subQuery = subQuery.ilike('name', `%${filters.search_text}%`);
    if (filters.state) subQuery = subQuery.eq('state', filters.state);
    if (filters.min_capacity) subQuery = subQuery.gte('available_mw', filters.min_capacity);
    if (filters.iso_region) subQuery = subQuery.eq('iso_region', filters.iso_region);

    const { data: subs } = await subQuery;
    if (subs) {
      for (const s of subs) {
        results.push({
          id: s.id,
          type: 'substation',
          name: s.name,
          subtitle: `${s.state} · ${s.available_mw || '?'}MW available · ${s.iso_region || s.utility || 'Unknown'}`,
        });
      }
    }
  }

  // Search parcels (new)
  if (filters.type === 'parcel' || filters.type === 'all') {
    let parcelQuery = supabase
      .from('parcels')
      .select('id, apn, address, acreage, zoning, state, county')
      .limit(10);

    if (filters.search_text) parcelQuery = parcelQuery.or(`address.ilike.%${filters.search_text}%,apn.ilike.%${filters.search_text}%`);
    if (filters.state) parcelQuery = parcelQuery.eq('state', filters.state);
    if (filters.min_acreage) parcelQuery = parcelQuery.gte('acreage', filters.min_acreage);
    if (filters.zoning) parcelQuery = parcelQuery.ilike('zoning', `%${filters.zoning}%`);

    const { data: parcels } = await parcelQuery;
    if (parcels) {
      for (const p of parcels) {
        results.push({
          id: p.id,
          type: 'parcel',
          name: p.address || `APN: ${p.apn || 'Unknown'}`,
          subtitle: `${p.state} · ${p.county} · ${p.acreage || '?'} acres · ${p.zoning || 'No zoning'}`,
        });
      }
    }
  }

  return NextResponse.json({ results });
}
