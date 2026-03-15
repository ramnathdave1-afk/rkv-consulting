import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const state = searchParams.get('state');
  const minMw = searchParams.get('min_mw');

  let query = supabase
    .from('substations')
    .select('*')
    .order('capacity_mw', { ascending: false });

  if (state) query = query.eq('state', state);
  if (minMw) query = query.gte('available_mw', Number(minMw));

  const { data, error } = await query.limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ substations: data });
}
