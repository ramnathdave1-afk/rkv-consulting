import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, orgId, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ location: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, orgId, role, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  const body = await request.json();

  // If switching this location to default, clear other defaults first
  if (body.is_default === true) {
    await supabase
      .from('locations')
      .update({ is_default: false })
      .eq('org_id', orgId)
      .neq('id', id);
  }

  const allowed: Record<string, unknown> = {};
  for (const k of [
    'name', 'slug', 'address_line1', 'city', 'state', 'zip',
    'phone', 'email', 'manager_user_id', 'is_default', 'is_active', 'metadata',
  ]) {
    if (k in body) allowed[k] = body[k];
  }
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('locations')
    .update(allowed)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ location: data });
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return PATCH(request, ctx);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, orgId, role, supabase } = await getUserOrg();
  if (!user || !orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  // Refuse to delete if properties are still attached
  const { count } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('location_id', id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} propert${count === 1 ? 'y is' : 'ies are'} still assigned to this location. Reassign them first.` },
      { status: 409 },
    );
  }

  // Don't allow deleting the org's only/default location
  const { data: existing } = await supabase
    .from('locations')
    .select('is_default')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (existing?.is_default) {
    return NextResponse.json(
      { error: 'Cannot delete the default location. Set another location as default first.' },
      { status: 409 },
    );
  }

  const { error } = await supabase.from('locations').delete().eq('id', id).eq('org_id', orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
