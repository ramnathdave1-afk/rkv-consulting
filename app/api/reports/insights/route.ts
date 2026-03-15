import { createClient } from '@/lib/supabase/server';
import { callClaude } from '@/lib/ai/claude';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 400 });

  // Gather data for AI analysis
  const [sitesRes, scoresRes, activityRes, marketRes] = await Promise.all([
    supabase
      .from('sites')
      .select('id, name, state, county, vertical, target_capacity, acreage, pipeline_stage, zoning')
      .eq('org_id', profile.org_id)
      .limit(50),
    supabase
      .from('site_scores')
      .select('site_id, composite_score, dimension_scores')
      .limit(50),
    supabase
      .from('agent_activity_log')
      .select('agent_name, action, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('market_intelligence')
      .select('state, region, metric, value')
      .limit(30),
  ]);

  const sites = sitesRes.data || [];
  const scores = scoresRes.data || [];
  const activity = activityRes.data || [];
  const market = marketRes.data || [];

  const systemPrompt = `You are Meridian Node AI — an expert land infrastructure intelligence analyst. You produce executive-quality portfolio analysis reports.

Return your response as valid JSON with this exact structure:
{
  "executive_summary": "2-3 sentence overview of the portfolio",
  "key_findings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "risk_factors": ["risk 1", "risk 2", "risk 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "market_outlook": "1-2 sentence market perspective"
}

Be specific with numbers, percentages, and site names. Be concise and data-driven.`;

  const dataPrompt = `Analyze this infrastructure development portfolio:

SITES (${sites.length} total):
${sites.map((s) => `- ${s.name} (${s.state}, ${s.vertical}, ${s.target_capacity || '?'}MW, ${s.acreage || '?'} acres, stage: ${s.pipeline_stage})`).join('\n')}

SCORES:
${scores.map((s) => `- Site ${s.site_id}: composite ${s.composite_score}/100`).join('\n')}

RECENT AGENT ACTIVITY:
${activity.slice(0, 10).map((a) => `- [${a.agent_name}] ${a.action}`).join('\n')}

MARKET INTELLIGENCE:
${market.map((m) => `- ${m.state} ${m.region}: ${m.metric} = ${m.value}`).join('\n')}

Produce the executive analysis JSON.`;

  const result = await callClaude(
    [{ role: 'user', content: dataPrompt }],
    systemPrompt,
  );

  try {
    const text = result?.content?.[0]?.text || result?.content || '';
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = typeof text === 'string' ? text.match(/\{[\s\S]*\}/) : null;
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return NextResponse.json({
      insights,
      generated_at: new Date().toISOString(),
      sites_analyzed: sites.length,
    });
  } catch {
    return NextResponse.json({
      insights: {
        executive_summary: 'Unable to generate AI insights. Please try again.',
        key_findings: [],
        risk_factors: [],
        recommendations: [],
        market_outlook: '',
      },
      generated_at: new Date().toISOString(),
      sites_analyzed: sites.length,
    });
  }
}
