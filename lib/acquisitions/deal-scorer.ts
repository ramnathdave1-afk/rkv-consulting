/**
 * Multi-Agent Deal Evaluation Engine
 * Based on debate-and-consensus architecture from the PRD.
 * Three specialized Claude agents evaluate independently, then a chief agent synthesizes.
 *
 * When a RentCast API key is configured, the ARV and Market agents are seeded
 * with REAL comparable sales, rent estimates, and market statistics. Claude
 * then validates / synthesizes against those data points instead of fabricating
 * numbers from training data. When RentCast is unavailable (no key, address
 * not found, network error), the engine falls back to Claude-only mode and
 * tags the result with `data_quality: 'simulated'` so the UI can warn the user.
 */

import { callClaude } from '@/lib/ai/claude';
import type { Deal } from '@/lib/types';
import {
  getRentEstimate,
  getValueEstimate,
  getMarketData,
  isRentCastConfigured,
  type RentalEstimate,
  type ValueEstimate,
  type MarketData,
} from './rentcast';

export type DealDataQuality = 'real' | 'partial' | 'simulated';

export interface DealEvaluation {
  composite_score: number;
  market_score: number;
  risk_score: number;
  location_score: number;
  condition_score: number;
  estimated_arv: number | null;
  repair_estimate: number | null;
  mao: number | null;
  arv_confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  agent_reports: {
    arv_agent: string;
    market_agent: string;
    risk_agent: string;
  };
  /** Whether the underlying numbers came from real comps or were fabricated by Claude. */
  data_quality: DealDataQuality;
  /** Summary of the data sources actually used (for UI display). */
  data_sources: {
    rentcast_value: boolean;
    rentcast_rent: boolean;
    rentcast_market: boolean;
    sale_comp_count: number;
    rent_comp_count: number;
    avg_comp_distance_miles: number | null;
  };
}

interface RealCompContext {
  value: ValueEstimate | null;
  rent: RentalEstimate | null;
  market: MarketData | null;
}

function dealContext(deal: Deal): string {
  return `Property: ${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}
Type: ${deal.property_type}
Bedrooms: ${deal.bedrooms || 'unknown'} | Bathrooms: ${deal.bathrooms || 'unknown'}
Sq Ft: ${deal.square_footage || 'unknown'} | Lot: ${deal.lot_size_sqft || 'unknown'} sqft
Year Built: ${deal.year_built || 'unknown'}
Asking Price: ${deal.asking_price ? `$${deal.asking_price.toLocaleString()}` : 'unknown'}
Seller Type: ${deal.seller_type || 'unknown'}
Source: ${deal.source}
Notes: ${deal.notes || 'none'}`;
}

function formatValueContext(value: ValueEstimate): string {
  const top = value.comparables.slice(0, 6);
  const compsLine = top
    .map(
      (c) =>
        `  - ${c.address} | $${c.sale_price.toLocaleString()} | ${c.bedrooms}br/${c.bathrooms}ba | ${c.square_feet} sqft | ${c.distance_miles.toFixed(2)} mi | sold ${c.sale_date || 'n/a'}`,
    )
    .join('\n');
  return `Real AVM (RentCast): $${value.value.toLocaleString()} (range $${value.value_low.toLocaleString()} - $${value.value_high.toLocaleString()})
Real sale comparables (${value.comparables.length} total, top ${top.length}):
${compsLine || '  (none returned)'}`;
}

function formatRentContext(rent: RentalEstimate): string {
  const top = rent.comparables.slice(0, 6);
  const compsLine = top
    .map(
      (c) =>
        `  - ${c.address} | $${c.rent.toLocaleString()}/mo | ${c.bedrooms}br/${c.bathrooms}ba | ${c.square_feet} sqft | ${c.distance_miles.toFixed(2)} mi`,
    )
    .join('\n');
  return `Real rent AVM (RentCast): $${rent.rent.toLocaleString()}/mo (range $${rent.rent_low.toLocaleString()} - $${rent.rent_high.toLocaleString()})
Real rental comparables (${rent.comparables.length} total, top ${top.length}):
${compsLine || '  (none returned)'}`;
}

function formatMarketContext(market: MarketData, zip: string): string {
  return `Real ZIP-level market (RentCast, ${zip}): median value $${market.median_value.toLocaleString()}, median rent $${market.median_rent.toLocaleString()}/mo, gross cap rate ${market.cap_rate.toFixed(2)}%`;
}

async function runARVAgent(deal: Deal, ctx: RealCompContext): Promise<string> {
  const realBlock = ctx.value
    ? `\n\nREAL DATA (use these as the ground truth — do not fabricate):\n${formatValueContext(ctx.value)}`
    : '\n\nNote: No real AVM/comps available for this address. Estimate from training data and FLAG your confidence as low.';

  const result = await callClaude(
    [{ role: 'user', content: dealContext(deal) + realBlock }],
    `You are the ARV (After Repair Value) Agent — a real estate valuation specialist.

${
  ctx.value
    ? 'You have been given REAL comparable sales and an AVM estimate. Anchor your ARV to these comps. If the subject differs (size, beds/baths, condition), adjust from the comps and explain the adjustment.'
    : 'You do NOT have real comps for this property. Estimate conservatively and mark confidence as "low".'
}

Provide:
1. ESTIMATED ARV (After Repair Value) — justify against the real comps when available
2. ESTIMATED REPAIR COSTS based on property age, type, and any condition signals
3. MAO (Maximum Allowable Offer) using the 70% rule: MAO = (ARV × 0.70) - Repair Costs
4. CONFIDENCE LEVEL in your ARV estimate (high/medium/low — high requires ≥3 real comps within ~1 mile)

Respond in JSON format:
{
  "estimated_arv": number,
  "repair_estimate": number,
  "mao": number,
  "arv_confidence": "high|medium|low",
  "price_per_sqft_estimate": number,
  "reasoning": "2-3 sentence explanation that references the real comps if used"
}`,
  );

  return extractText(result);
}

async function runMarketAgent(deal: Deal, ctx: RealCompContext): Promise<string> {
  const rentBlock = ctx.rent
    ? `\n\n${formatRentContext(ctx.rent)}`
    : '\n\nNote: No real rent comps available for this address. Estimate from training data.';
  const marketBlock = ctx.market
    ? `\n${formatMarketContext(ctx.market, deal.zip)}`
    : '';

  const result = await callClaude(
    [
      {
        role: 'user',
        content: dealContext(deal) + rentBlock + marketBlock,
      },
    ],
    `You are the Market Agent — a real estate market analyst.

${
  ctx.rent || ctx.market
    ? 'You have REAL rent comps and/or ZIP-level market data. Anchor your monthly rent and cap rate to these. Do not fabricate numbers when real data is provided.'
    : 'You do NOT have real market data for this property. Estimate conservatively.'
}

Evaluate:
1. MARKET SCORE (0-100) — investment potential of the location
2. LOCATION SCORE (0-100) — neighborhood desirability and growth
3. DEMAND ASSESSMENT for this property type in this market
4. ESTIMATED MONTHLY RENT (anchor to real comps when available)
5. CAP RATE estimate (anchor to real market cap rate when available)

Respond in JSON format:
{
  "market_score": number,
  "location_score": number,
  "demand_level": "high|medium|low",
  "estimated_monthly_rent": number,
  "cap_rate_estimate": number,
  "reasoning": "2-3 sentence assessment that references the real data if used"
}`,
  );

  return extractText(result);
}

async function runRiskAgent(deal: Deal): Promise<string> {
  const result = await callClaude(
    [{ role: 'user', content: dealContext(deal) }],
    `You are the Risk Agent — a real estate risk assessor. Evaluate the risks of this deal:

1. RISK SCORE (0-100, where 100 = lowest risk / safest deal)
2. CONDITION SCORE (0-100) estimating property condition based on age and type
3. KEY RISKS identified for this specific deal
4. DEAL BREAKERS if any

Consider: property age, seller motivation type, asking price vs likely ARV, market risks, structural risks for older properties, and any red flags.

Respond in JSON format:
{
  "risk_score": number,
  "condition_score": number,
  "key_risks": ["risk1", "risk2"],
  "deal_breakers": [],
  "exit_strategy": "flip|hold|wholesale",
  "reasoning": "2-3 sentence risk assessment"
}`,
  );

  return extractText(result);
}

async function runChiefAgent(
  deal: Deal,
  arvReport: string,
  marketReport: string,
  riskReport: string,
  ctx: RealCompContext,
): Promise<string> {
  const realDataNote = ctx.value || ctx.rent || ctx.market
    ? `\n\nNOTE: This evaluation has access to REAL RentCast data — prefer numbers anchored to those comps when resolving disagreements between agents.`
    : `\n\nNOTE: No real comps were available — treat all numbers as estimates and lean toward "low" arv_confidence.`;

  const result = await callClaude(
    [
      {
        role: 'user',
        content: `DEAL:
${dealContext(deal)}

ARV AGENT REPORT:
${arvReport}

MARKET AGENT REPORT:
${marketReport}

RISK AGENT REPORT:
${riskReport}${realDataNote}`,
      },
    ],
    `You are the Chief Agent — you synthesize evaluations from three specialized agents into a final deal score and recommendation.

Review all three agent reports and produce a FINAL evaluation:

1. COMPOSITE SCORE (0-100) — weighted blend of all agent inputs
2. FINAL ARV, REPAIR ESTIMATE, and MAO — resolve any disagreements between agents
3. GO/NO-GO RECOMMENDATION with reasoning
4. Identify any disagreements between agents and explain your resolution

Respond in JSON format:
{
  "composite_score": number,
  "market_score": number,
  "risk_score": number,
  "location_score": number,
  "condition_score": number,
  "estimated_arv": number,
  "repair_estimate": number,
  "mao": number,
  "arv_confidence": "high|medium|low",
  "recommendation": "strong_buy|buy|hold|pass",
  "reasoning": "3-4 sentence final assessment synthesizing all agent inputs"
}`,
  );

  return extractText(result);
}

function extractText(result: { content?: unknown; error?: string }): string {
  if (result.error) return '{}';
  const content = result.content;
  if (Array.isArray(content)) return content.map((b: { text?: string }) => b.text || '').join('');
  if (typeof content === 'string') return content;
  return '{}';
}

function parseJSON(text: string): Record<string, unknown> {
  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

async function fetchRealCompContext(
  deal: Deal,
  explicitKey?: string,
): Promise<RealCompContext> {
  if (!isRentCastConfigured(explicitKey)) {
    return { value: null, rent: null, market: null };
  }

  const addr = {
    address: deal.address,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
  };
  const beds = deal.bedrooms ?? undefined;
  const baths = deal.bathrooms ?? undefined;
  const sqft = deal.square_footage ?? undefined;

  // Run all three RentCast lookups in parallel — they're independent.
  const [value, rent, market] = await Promise.all([
    getValueEstimate(addr, beds, baths, sqft, explicitKey),
    getRentEstimate(addr, beds, baths, sqft, explicitKey),
    deal.zip ? getMarketData(deal.zip, explicitKey) : Promise.resolve(null),
  ]);

  return { value, rent, market };
}

function classifyDataQuality(ctx: RealCompContext): DealDataQuality {
  const hits = [ctx.value, ctx.rent, ctx.market].filter(Boolean).length;
  if (hits === 0) return 'simulated';
  if (hits === 3) return 'real';
  return 'partial';
}

function avgCompDistance(ctx: RealCompContext): number | null {
  const all = [
    ...(ctx.value?.comparables ?? []).map((c) => c.distance_miles),
    ...(ctx.rent?.comparables ?? []).map((c) => c.distance_miles),
  ].filter((d) => typeof d === 'number' && d > 0);
  if (all.length === 0) return null;
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  return Math.round(avg * 100) / 100;
}

export async function evaluateDeal(
  deal: Deal,
  options?: { rentcastApiKey?: string },
): Promise<DealEvaluation> {
  // 1. Pull real comps from RentCast first (or get nulls if unconfigured / not found)
  const ctx = await fetchRealCompContext(deal, options?.rentcastApiKey);

  // 2. Run the three specialist agents in parallel, seeded with real data
  const [arvReport, marketReport, riskReport] = await Promise.all([
    runARVAgent(deal, ctx),
    runMarketAgent(deal, ctx),
    runRiskAgent(deal),
  ]);

  // 3. Chief agent synthesizes
  const chiefReport = await runChiefAgent(deal, arvReport, marketReport, riskReport, ctx);
  const chief = parseJSON(chiefReport);

  const data_quality = classifyDataQuality(ctx);

  return {
    composite_score: Number(chief.composite_score) || 50,
    market_score: Number(chief.market_score) || 50,
    risk_score: Number(chief.risk_score) || 50,
    location_score: Number(chief.location_score) || 50,
    condition_score: Number(chief.condition_score) || 50,
    estimated_arv: Number(chief.estimated_arv) || null,
    repair_estimate: Number(chief.repair_estimate) || null,
    mao: Number(chief.mao) || null,
    arv_confidence: (chief.arv_confidence as 'high' | 'medium' | 'low') || 'low',
    reasoning: String(chief.reasoning || 'Unable to generate assessment'),
    agent_reports: {
      arv_agent: arvReport,
      market_agent: marketReport,
      risk_agent: riskReport,
    },
    data_quality,
    data_sources: {
      rentcast_value: !!ctx.value,
      rentcast_rent: !!ctx.rent,
      rentcast_market: !!ctx.market,
      sale_comp_count: ctx.value?.comparables.length ?? 0,
      rent_comp_count: ctx.rent?.comparables.length ?? 0,
      avg_comp_distance_miles: avgCompDistance(ctx),
    },
  };
}

/**
 * Calculate MAO using the 70% rule.
 * MAO = (ARV × 0.70) - Repair Costs
 */
export function calculateMAO(arv: number, repairEstimate: number, formula: '70_rule' | 'custom' = '70_rule'): number {
  if (formula === '70_rule') {
    return Math.round(arv * 0.7 - repairEstimate);
  }
  return Math.round(arv * 0.7 - repairEstimate);
}
