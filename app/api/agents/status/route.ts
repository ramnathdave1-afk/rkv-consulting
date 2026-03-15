import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabase
    .from('agent_activity_log')
    .select('agent_name, created_at')
    .gte('created_at', cutoff)
    .not('agent_name', 'is', null);

  const agentCounts: Record<string, { count: number; lastRun: string | null }> = {};
  (logs || []).forEach((l) => {
    if (!l.agent_name) return;
    if (!agentCounts[l.agent_name]) {
      agentCounts[l.agent_name] = { count: 0, lastRun: null };
    }
    agentCounts[l.agent_name].count++;
    if (!agentCounts[l.agent_name].lastRun || l.created_at > agentCounts[l.agent_name].lastRun!) {
      agentCounts[l.agent_name].lastRun = l.created_at;
    }
  });

  const agents = ['alpha', 'beta', 'gamma', 'delta'].map((name) => ({
    name,
    status: 'idle' as const,
    actions_24h: agentCounts[name]?.count || 0,
    last_run: agentCounts[name]?.lastRun || null,
  }));

  return NextResponse.json({ agents });
}
