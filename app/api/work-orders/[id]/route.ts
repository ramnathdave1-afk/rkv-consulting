import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  recordAcknowledgment,
  recordFirstResponse,
  recordResolution,
} from '@/lib/sla/track';
import { logAuditEvent, diffChanges, requestContext } from '@/lib/audit/log-action';

const RESOLVED_STATUSES = new Set(['completed', 'closed']);
const ACK_STATUSES = new Set(['assigned', 'in_progress', 'parts_needed', 'completed', 'closed']);
const FIRST_RESPONSE_STATUSES = new Set(['in_progress', 'parts_needed', 'completed', 'closed']);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase
    .from('work_orders')
    .select('*, properties(name, address_line1), units(unit_number), tenants(first_name, last_name, phone), vendors(name, company, phone)')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ work_order: data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: before } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const body = await request.json();
  const { data, error } = await supabase
    .from('work_orders')
    .update(body)
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const prevStatus: string = (before?.status as string) ?? '';
  const nextStatus: string = (data?.status as string) ?? '';
  if (prevStatus !== nextStatus && nextStatus) {
    if (ACK_STATUSES.has(nextStatus) && !ACK_STATUSES.has(prevStatus)) {
      await recordAcknowledgment('work_order', id);
    }
    if (FIRST_RESPONSE_STATUSES.has(nextStatus) && !FIRST_RESPONSE_STATUSES.has(prevStatus)) {
      await recordFirstResponse('work_order', id);
    }
    if (RESOLVED_STATUSES.has(nextStatus) && !RESOLVED_STATUSES.has(prevStatus)) {
      await recordResolution('work_order', id);
    }
  }

  const ctx = requestContext(request);
  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'update',
    resource_type: 'work_order',
    resource_id: id,
    changes: diffChanges(before as Record<string, unknown>, data as Record<string, unknown>),
    ...ctx,
  });

  return NextResponse.json({ work_order: data });
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
    .from('work_orders')
    .select('id, title, status, priority')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  const { error } = await supabase
    .from('work_orders')
    .delete()
    .eq('id', id)
    .eq('org_id', profile.org_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ctx = requestContext(request);
  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'delete',
    resource_type: 'work_order',
    resource_id: id,
    metadata: before ?? {},
    ...ctx,
  });

  return NextResponse.json({ success: true });
}
