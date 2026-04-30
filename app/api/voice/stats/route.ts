import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureException } from '@/lib/monitoring/sentry';
import { getUserOrg } from '@/lib/auth/get-user-org';

export async function GET() {
  const { orgId } = await getUserOrg();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Total voice conversations
    const { count: totalCalls } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('channel', 'voice');

    // Calls today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: callsToday } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('channel', 'voice')
      .gte('created_at', todayStart.toISOString());

    // AI-handled conversations (status = 'ai_handling' or 'closed' with no human escalation)
    const { count: aiHandled } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('channel', 'voice')
      .in('status', ['ai_handling', 'closed', 'active']);

    const aiPercent = totalCalls && totalCalls > 0
      ? Math.round(((aiHandled || 0) / totalCalls) * 100)
      : 0;

    // Active campaigns
    const { count: activeCampaigns } = await supabase
      .from('voice_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .in('status', ['running', 'scheduled']);

    return NextResponse.json({
      totalCalls: totalCalls || 0,
      callsToday: callsToday || 0,
      aiPercent,
      activeCampaigns: activeCampaigns || 0,
    });
  } catch (err) {
    captureException(err, { route: 'voice/stats' });
    return NextResponse.json(
      { error: 'Failed to fetch voice stats' },
      { status: 500 },
    );
  }
}
