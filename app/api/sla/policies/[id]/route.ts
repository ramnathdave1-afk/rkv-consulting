import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent, diffChanges, requestContext } from '@/lib/audit/log-action';

async function loadProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();
  return { user, profile };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await loadProfile(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase
    .from('sla_policies')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ policy: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await loadProfile(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { data: before } = await supabase
    .from('sla_policies')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const body = await request.json();
  const { data, error } = await supabase
    .from('sla_policies')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'update',
    resource_type: 'sla_policy',
    resource_id: id,
    changes: diffChanges(before as Record<string, unknown>, data as Record<string, unknown>),
    ...requestContext(request),
  });

  return NextResponse.json({ policy: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, profile } = await loadProfile(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!profile || !['admin', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { error } = await supabase
    .from('sla_policies')
    .delete()
    .eq('id', id)
    .eq('org_id', profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'delete',
    resource_type: 'sla_policy',
    resource_id: id,
    ...requestContext(request),
  });

  return NextResponse.json({ success: true });
}
