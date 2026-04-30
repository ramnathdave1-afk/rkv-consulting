import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent, diffChanges, requestContext } from '@/lib/audit/log-action';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: before } = await supabase
    .from('integrations')
    .select('id, platform, auth_type, status')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('id', id)
    .eq('org_id', profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'integration_disconnect',
    resource_type: 'integration',
    resource_id: id,
    metadata: before ?? {},
    ...requestContext(request),
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: before } = await supabase
    .from('integrations')
    .select('id, platform, auth_type, status, sync_config')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const body = await request.json();
  const { data, error } = await supabase
    .from('integrations')
    .update(body)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'update',
    resource_type: 'integration',
    resource_id: id,
    changes: diffChanges(before as Record<string, unknown>, data as Record<string, unknown>),
    ...requestContext(request),
  });

  return NextResponse.json({ integration: data });
}
