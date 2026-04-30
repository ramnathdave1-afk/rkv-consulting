import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent, diffChanges, requestContext } from '@/lib/audit/log-action';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ tenant: data });
}

async function patchTenant(request: NextRequest, id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: before } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const body = await request.json();
  const { data, error } = await supabase
    .from('tenants')
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
    resource_type: 'tenant',
    resource_id: id,
    changes: diffChanges(before as Record<string, unknown>, data as Record<string, unknown>),
    ...requestContext(request),
  });

  return NextResponse.json({ tenant: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return patchTenant(request, id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return patchTenant(request, id);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: before } = await supabase
    .from('tenants')
    .select('id, first_name, last_name, email')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id)
    .eq('org_id', profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'delete',
    resource_type: 'tenant',
    resource_id: id,
    metadata: before ?? {},
    ...requestContext(request),
  });

  return NextResponse.json({ success: true });
}
