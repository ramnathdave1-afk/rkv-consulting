import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent, requestContext } from '@/lib/audit/log-action';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase
    .from('sla_policies')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('resource_type')
    .order('priority', { nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policies: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from('sla_policies')
    .insert({
      org_id: profile.org_id,
      name: body.name,
      resource_type: body.resource_type,
      priority: body.priority ?? null,
      acknowledge_within_min: body.acknowledge_within_min ?? null,
      first_response_within_min: body.first_response_within_min ?? null,
      resolve_within_min: body.resolve_within_min ?? null,
      business_hours_only: body.business_hours_only ?? false,
      enabled: body.enabled ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'create',
    resource_type: 'sla_policy',
    resource_id: data.id,
    metadata: { name: data.name, resource_type: data.resource_type, priority: data.priority },
    ...requestContext(request),
  });

  return NextResponse.json({ policy: data }, { status: 201 });
}
