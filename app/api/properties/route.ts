import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkLimit, incrementUsage } from '@/lib/billing/usage';
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
    .from('properties')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ properties: data });
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

  const usageCheck = await checkLimit(profile.org_id, 'properties');
  if (!usageCheck.allowed) {
    return NextResponse.json({
      error: 'Property limit reached',
      usage: usageCheck,
      upgrade_url: '/settings/billing',
    }, { status: 402 });
  }

  const body = await request.json();
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...body, org_id: profile.org_id, created_by: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await incrementUsage(profile.org_id, 'properties');

  const ctx = requestContext(request);
  await logAuditEvent({
    orgId: profile.org_id,
    userId: user.id,
    action: 'create',
    resource_type: 'property',
    resource_id: data.id,
    metadata: { name: data.name, address_line1: data.address_line1 },
    ...ctx,
  });

  return NextResponse.json({ property: data }, { status: 201 });
}
