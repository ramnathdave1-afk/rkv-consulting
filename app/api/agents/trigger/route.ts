import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can trigger agents' }, { status: 403 });
  }

  const body = await request.json();
  const { agent } = body;

  if (!agent || !['alpha', 'beta', 'gamma', 'delta'].includes(agent)) {
    return NextResponse.json({ error: 'Invalid agent name' }, { status: 400 });
  }

  // Log the manual trigger
  await supabase.from('agent_activity_log').insert({
    agent_name: agent,
    action: `Manual trigger by ${profile.role}`,
    details: { triggered_by: user.id },
    org_id: profile.org_id,
  });

  // In production, this would send a message to the Railway worker
  // For now, just log it
  return NextResponse.json({
    success: true,
    message: `Agent ${agent} trigger logged. Worker will pick it up on next scheduled run.`,
  });
}
