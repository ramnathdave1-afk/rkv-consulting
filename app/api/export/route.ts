import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const format = request.nextUrl.searchParams.get('format') || 'json';
  const type = request.nextUrl.searchParams.get('type') || 'sites';

  let data;
  switch (type) {
    case 'sites': {
      const { data: sites } = await supabase
        .from('sites')
        .select('*, site_scores(composite_score, grid_score, land_score, risk_score, market_score, connectivity_score)')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });
      data = sites || [];
      break;
    }
    case 'feasibility': {
      const { data: results } = await supabase
        .from('feasibility_results')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('analyzed_at', { ascending: false });
      data = results || [];
      break;
    }
    default:
      return NextResponse.json({ error: 'Invalid type. Use: sites, feasibility' }, { status: 400 });
  }

  if (format === 'csv') {
    if (!data.length) {
      return new Response('No data', { headers: { 'Content-Type': 'text/csv' } });
    }
    const flatData = data.map((row: Record<string, unknown>) => {
      const flat: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
            flat[`${k}_${nk}`] = nv;
          }
        } else {
          flat[k] = v;
        }
      }
      return flat;
    });
    const headers = Object.keys(flatData[0]);
    const csv = [
      headers.join(','),
      ...flatData.map((row: Record<string, unknown>) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','),
      ),
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ data, exported_at: new Date().toISOString(), count: data.length });
}
