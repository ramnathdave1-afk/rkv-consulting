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

  const url = new URL(request.url);
  const breached = url.searchParams.get('breached');
  const resourceType = url.searchParams.get('resource_type');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const open = url.searchParams.get('open'); // 'true' = unresolved
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '200'), 1000);

  let q = supabase
    .from('sla_events')
    .select('*, sla_policies(name, acknowledge_within_min, first_response_within_min, resolve_within_min)')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (resourceType) q = q.eq('resource_type', resourceType);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  if (open === 'true') q = q.is('resolved_at', null);
  if (breached === 'true') {
    q = q.or(
      'acknowledge_breached.eq.true,first_response_breached.eq.true,resolve_breached.eq.true',
    );
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute summary stats
  const total = data?.length ?? 0;
  const ackBreached = data?.filter((e) => e.acknowledge_breached).length ?? 0;
  const frBreached = data?.filter((e) => e.first_response_breached).length ?? 0;
  const resolveBreached = data?.filter((e) => e.resolve_breached).length ?? 0;
  const resolved = data?.filter((e) => e.resolved_at).length ?? 0;

  return NextResponse.json({
    events: data,
    summary: {
      total,
      acknowledge_breaches: ackBreached,
      first_response_breaches: frBreached,
      resolve_breaches: resolveBreached,
      resolved,
      open: total - resolved,
    },
  });
}
