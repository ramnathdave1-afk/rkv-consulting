import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const resourceType = url.searchParams.get('resource_type');
  const userId = url.searchParams.get('user_id');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const search = url.searchParams.get('q');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '200'), 1000);
  const offset = Number(url.searchParams.get('offset') ?? '0');

  let q = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) q = q.eq('action', action);
  if (resourceType) q = q.eq('resource_type', resourceType);
  if (userId) q = q.eq('user_id', userId);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  if (search) q = q.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data, total: count ?? 0 });
}
