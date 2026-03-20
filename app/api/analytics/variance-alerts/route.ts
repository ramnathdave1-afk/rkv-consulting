import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkVarianceAlerts } from '@/lib/analytics/variance-alerts';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const url = new URL(request.url);
  const acknowledged = url.searchParams.get('acknowledged');

  let query = supabase
    .from('variance_alerts')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (acknowledged === 'false') {
    query = query.eq('acknowledged', false);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ alerts: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();

  if (body.action === 'check') {
    const alertsCreated = await checkVarianceAlerts(profile.org_id, body.property_id);
    return NextResponse.json({ alerts_created: alertsCreated });
  }

  if (body.action === 'acknowledge' && body.alert_id) {
    const { error } = await supabase
      .from('variance_alerts')
      .update({ acknowledged: true, acknowledged_by: user.id, acknowledged_at: new Date().toISOString() })
      .eq('id', body.alert_id)
      .eq('org_id', profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
