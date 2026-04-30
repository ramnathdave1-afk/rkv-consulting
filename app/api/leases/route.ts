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
    .from('leases')
    .select('*, units(unit_number, property_id, properties(name)), tenants(first_name, last_name)')
    .eq('org_id', profile.org_id)
    .order('lease_end', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leases: data });
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

  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await supabase
    .from('leases')
    .insert({ ...body, org_id: profile.org_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'create',
    resource_type: 'lease',
    resource_id: data.id,
    metadata: { unit_id: data.unit_id, tenant_id: data.tenant_id, status: data.status },
    ...requestContext(request),
  });

  return NextResponse.json({ lease: data }, { status: 201 });
}
