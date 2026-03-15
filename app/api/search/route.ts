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

  // Get user's org
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
    `You are a search query parser for a data center site selection platform. Extract structured filters from the user query.
Return JSON only with these optional fields:
- search_text: string (name/location text to search)
- state: string (US state abbreviation)
- min_mw: number
- max_mw: number
- min_score: number
- min_acreage: number
- pipeline_stage: string (ghost_site|due_diligence|loi|under_contract|closed)
- type: string (site|substation|all)
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

  // Search ghost_sites
  if (!filters.type || filters.type === 'site' || filters.type === 'all') {
    let siteQuery = supabase
      .from('ghost_sites')
      .select('id, name, state, county, pipeline_stage, target_mw, acreage')
      .eq('org_id', profile.org_id)
      .limit(10);

    if (filters.search_text) {
      siteQuery = siteQuery.ilike('name', `%${filters.search_text}%`);
    }
    if (filters.state) {
      siteQuery = siteQuery.eq('state', filters.state);
    }
    if (filters.min_mw) {
      siteQuery = siteQuery.gte('target_mw', filters.min_mw);
    }
    if (filters.pipeline_stage) {
      siteQuery = siteQuery.eq('pipeline_stage', filters.pipeline_stage);
    }

    const { data: sites } = await siteQuery;
    if (sites) {
      for (const s of sites) {
        results.push({
          id: s.id,
          type: 'site',
          name: s.name,
          subtitle: `${s.state}${s.county ? ` · ${s.county}` : ''} · ${s.target_mw || '?'}MW · ${s.pipeline_stage?.replace('_', ' ')}`,
        });
      }
    }
  }

  // Search substations
  if (!filters.type || filters.type === 'substation' || filters.type === 'all') {
    let subQuery = supabase
      .from('substations')
      .select('id, name, state, capacity_mw, available_mw, utility')
      .limit(10);

    if (filters.search_text) {
      subQuery = subQuery.ilike('name', `%${filters.search_text}%`);
    }
    if (filters.state) {
      subQuery = subQuery.eq('state', filters.state);
    }
    if (filters.min_mw) {
      subQuery = subQuery.gte('available_mw', filters.min_mw);
    }

    const { data: subs } = await subQuery;
    if (subs) {
      for (const s of subs) {
        results.push({
          id: s.id,
          type: 'substation',
          name: s.name,
          subtitle: `${s.state} · ${s.available_mw || '?'}MW available · ${s.utility || 'Unknown utility'}`,
        });
      }
    }
  }

  return NextResponse.json({ results });
}
