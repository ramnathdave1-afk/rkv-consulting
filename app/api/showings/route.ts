import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkLimit, incrementUsage } from '@/lib/billing/usage';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase
    .from('showings')
    .select('*, properties(name, address_line1), units(unit_number)')
    .eq('org_id', profile.org_id)
    .order('scheduled_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ showings: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const usageCheck = await checkLimit(profile.org_id, 'showings');
  if (!usageCheck.allowed) {
    return NextResponse.json({ error: 'Showing limit reached', usage: usageCheck, upgrade_url: '/settings/billing' }, { status: 402 });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.property_id) {
    return NextResponse.json({ error: 'property_id is required' }, { status: 400 });
  }
  if (!body.scheduled_at) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('showings')
    .insert({
      ...body,
      org_id: profile.org_id,
      created_by: user.id,
      follow_up_status: body.follow_up_status || 'pending',
      reminder_sent: false,
    })
    .select('*, properties(name, address_line1), units(unit_number)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await incrementUsage(profile.org_id, 'showings');
  return NextResponse.json({ showing: data }, { status: 201 });
}
