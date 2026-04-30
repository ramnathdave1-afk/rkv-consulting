import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent, diffChanges, requestContext } from '@/lib/audit/log-action';

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('org_id, role').eq('user_id', userId).single();
  return data;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrgId(supabase, user.id);
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ property: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrgId(supabase, user.id);
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: before } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const body = await request.json();
  const { data, error } = await supabase
    .from('properties')
    .update(body)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ctx = requestContext(request);
  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'update',
    resource_type: 'property',
    resource_id: id,
    changes: diffChanges(before as Record<string, unknown>, data as Record<string, unknown>),
    ...ctx,
  });

  return NextResponse.json({ property: data });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return PATCH(request, context);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getOrgId(supabase, user.id);
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: before } = await supabase
    .from('properties')
    .select('id, name, address_line1')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const { error } = await supabase.from('properties').delete().eq('id', id).eq('org_id', profile.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ctx = requestContext(request);
  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'delete',
    resource_type: 'property',
    resource_id: id,
    metadata: before ?? {},
    ...ctx,
  });

  return NextResponse.json({ success: true });
}
