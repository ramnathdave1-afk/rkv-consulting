/**
 * POST /api/deals/[id]/score
 * Runs the multi-agent deal evaluation using Claude.
 * Three specialized agents evaluate independently, then a chief agent synthesizes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateDeal } from '@/lib/acquisitions/deal-scorer';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data: deal } = await supabase.from('deals').select('*').eq('id', id).eq('org_id', profile.org_id).single();
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

  const result = await evaluateDeal(deal);

  // Update deal with scores
  const { data: updated } = await supabase
    .from('deals')
    .update({
      deal_score: result.composite_score,
      market_score: result.market_score,
      risk_score: result.risk_score,
      location_score: result.location_score,
      condition_score: result.condition_score,
      arv: result.estimated_arv,
      mao: result.mao,
      repair_estimate: result.repair_estimate,
      arv_confidence: result.arv_confidence,
      score_reasoning: result.reasoning,
    })
    .eq('id', id)
    .select()
    .single();

  // Log AI analysis activity
  await supabase.from('deal_activity').insert({
    deal_id: id,
    org_id: profile.org_id,
    activity_type: 'ai_analysis',
    content: `Deal scored ${result.composite_score}/100. ${result.reasoning}`,
    metadata: result,
    created_by: user.id,
  });

  return NextResponse.json({ deal: updated, evaluation: result });
}
