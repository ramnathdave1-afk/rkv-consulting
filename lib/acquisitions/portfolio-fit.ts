/**
 * Portfolio Fit Analysis
 * Evaluates how a potential acquisition affects existing portfolio metrics
 * (NOI, occupancy, geographic concentration).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { callClaude } from '@/lib/ai/claude';
import type { Deal } from '@/lib/types';

export interface PortfolioMetrics {
  total_properties: number;
  total_units: number;
  avg_occupancy: number;
  total_monthly_revenue: number;
  total_monthly_expenses: number;
  monthly_noi: number;
  geographic_concentration: Record<string, number>;
  property_type_mix: Record<string, number>;
}

export interface PortfolioFitResult {
  fit_score: number;
  impact_summary: string;
  geographic_diversification: 'improves' | 'neutral' | 'concentrates';
  type_diversification: 'improves' | 'neutral' | 'concentrates';
  projected_noi_change_pct: number;
  projected_unit_count: number;
  risks: string[];
  opportunities: string[];
}

export async function getPortfolioMetrics(orgId: string): Promise<PortfolioMetrics> {
  const supabase = createAdminClient();

  const [{ data: properties }, { data: units }, { data: leases }] = await Promise.all([
    supabase.from('properties').select('id, city, state, property_type, unit_count').eq('org_id', orgId),
    supabase.from('units').select('id, status').eq('org_id', orgId),
    supabase.from('leases').select('monthly_rent').eq('org_id', orgId).eq('status', 'active'),
  ]);

  const allUnits = units || [];
  const occupied = allUnits.filter((u) => u.status === 'occupied').length;
  const totalRevenue = (leases || []).reduce((s, l) => s + Number(l.monthly_rent), 0);

  const geoConcentration: Record<string, number> = {};
  const typeMix: Record<string, number> = {};
  for (const p of (properties || [])) {
    const geo = `${p.city}, ${p.state}`;
    geoConcentration[geo] = (geoConcentration[geo] || 0) + (p.unit_count || 0);
    typeMix[p.property_type] = (typeMix[p.property_type] || 0) + (p.unit_count || 0);
  }

  return {
    total_properties: (properties || []).length,
    total_units: allUnits.length,
    avg_occupancy: allUnits.length > 0 ? (occupied / allUnits.length) * 100 : 0,
    total_monthly_revenue: totalRevenue,
    total_monthly_expenses: totalRevenue * 0.45, // estimate
    monthly_noi: totalRevenue * 0.55,
    geographic_concentration: geoConcentration,
    property_type_mix: typeMix,
  };
}

export async function analyzePortfolioFit(orgId: string, deal: Deal): Promise<PortfolioFitResult> {
  const metrics = await getPortfolioMetrics(orgId);

  const geo = `${deal.city}, ${deal.state}`;
  const geoExists = metrics.geographic_concentration[geo] || 0;
  const totalUnits = metrics.total_units || 1;
  const geoConcentrationPct = (geoExists / totalUnits) * 100;

  const geoDiversification: PortfolioFitResult['geographic_diversification'] =
    geoConcentrationPct > 40 ? 'concentrates' :
    geoConcentrationPct === 0 ? 'improves' : 'neutral';

  const typeExists = metrics.property_type_mix[deal.property_type] || 0;
  const typeConcentrationPct = (typeExists / totalUnits) * 100;
  const typeDiversification: PortfolioFitResult['type_diversification'] =
    typeConcentrationPct > 60 ? 'concentrates' :
    typeConcentrationPct === 0 ? 'improves' : 'neutral';

  const estimatedUnits = deal.bedrooms || (deal.property_type === 'multifamily' ? 10 : 1);
  const projectedUnits = totalUnits + estimatedUnits;

  // Use Claude for deeper analysis
  const result = await callClaude(
    [{ role: 'user', content: `CURRENT PORTFOLIO:
${JSON.stringify(metrics, null, 2)}

POTENTIAL ACQUISITION:
Address: ${deal.address}, ${deal.city}, ${deal.state}
Type: ${deal.property_type}
Asking: $${deal.asking_price?.toLocaleString() || 'unknown'}
ARV: $${deal.arv?.toLocaleString() || 'unknown'}
Units: ~${estimatedUnits}

Analyze portfolio fit. Respond in JSON:
{
  "fit_score": 0-100,
  "impact_summary": "2-sentence summary",
  "projected_noi_change_pct": number,
  "risks": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"]
}` }],
    'You are a portfolio analyst. Evaluate how this acquisition fits the existing portfolio. Be specific about NOI impact, diversification, and risks. Respond with ONLY JSON.'
  );

  const text = Array.isArray(result?.content)
    ? result.content[0]?.text || '{}'
    : typeof result?.content === 'string' ? result.content : '{}';

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
  } catch { /* use defaults */ }

  return {
    fit_score: Number(parsed.fit_score) || 50,
    impact_summary: String(parsed.impact_summary || `Adding ${estimatedUnits} units in ${geo} to a ${totalUnits}-unit portfolio.`),
    geographic_diversification: geoDiversification,
    type_diversification: typeDiversification,
    projected_noi_change_pct: Number(parsed.projected_noi_change_pct) || 0,
    projected_unit_count: projectedUnits,
    risks: (parsed.risks as string[]) || [],
    opportunities: (parsed.opportunities as string[]) || [],
  };
}
