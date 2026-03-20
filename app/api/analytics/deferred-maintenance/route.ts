import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertDeferredMaintenance, getMaintenanceCostTrend } from '@/lib/maintenance/deferred-tracker';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id') || undefined;

  const [{ data: items }, costTrend] = await Promise.all([
    supabase
      .from('deferred_maintenance')
      .select('*, properties(name)')
      .eq('org_id', profile.org_id)
      .order('priority', { ascending: true })
      .order('occurrence_count', { ascending: false }),
    getMaintenanceCostTrend(profile.org_id, propertyId),
  ]);

  return NextResponse.json({ items: items || [], cost_trend: costTrend });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const upserted = await upsertDeferredMaintenance(profile.org_id);
  return NextResponse.json({ upserted });
}
