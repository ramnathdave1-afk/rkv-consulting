import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startSlaTracking, type SlaPriority } from '@/lib/sla/track';
import { logAuditEvent, requestContext } from '@/lib/audit/log-action';

function mapPriorityToSla(p: string | null | undefined): SlaPriority | undefined {
  if (!p) return undefined;
  if (p === 'emergency' || p === 'high' || p === 'low') return p;
  if (p === 'medium' || p === 'standard') return 'standard';
  return undefined;
}

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
    .from('work_orders')
    .select('*, properties(name), units(unit_number), tenants(first_name, last_name), vendors(name, company)')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ work_orders: data });
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
    .from('work_orders')
    .insert({ ...body, org_id: profile.org_id, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Start SLA tracking
  await startSlaTracking({
    orgId: profile.org_id,
    resourceType: 'work_order',
    resourceId: data.id,
    priority: mapPriorityToSla(data.priority),
  });

  // Audit
  const ctx = requestContext(request);
  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'create',
    resource_type: 'work_order',
    resource_id: data.id,
    metadata: { title: data.title, priority: data.priority, status: data.status },
    ...ctx,
  });

  return NextResponse.json({ work_order: data }, { status: 201 });
}
