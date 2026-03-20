/**
 * Multi-Agent Deal Evaluation Engine
 * Based on debate-and-consensus architecture from the PRD.
 * Three specialized Claude agents evaluate independently, then a chief agent synthesizes.
 */

import { callClaude } from '@/lib/ai/claude';
import type { Deal } from '@/lib/types';

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

async function runARVAgent(deal: Deal): Promise<string> {
  const result = await callClaude(
    [{ role: 'user', content: dealContext(deal) }],
    `You are the ARV Agent — a real estate valuation specialist. Analyze this property and provide:

1. ESTIMATED ARV (After Repair Value) based on the property details, location, and type
2. ESTIMATED REPAIR COSTS based on property age, type, and condition signals
3. MAO (Maximum Allowable Offer) using the 70% rule: MAO = (ARV × 0.70) - Repair Costs
4. CONFIDENCE LEVEL in your ARV estimate (high/medium/low)

Consider: property age, square footage, bedroom/bathroom count, location (city/state), and any condition signals from the notes.

If you don't have enough data for a precise ARV, provide a reasonable range and explain your assumptions.

Respond in JSON format:
{
  "estimated_arv": number,
  "repair_estimate": number,
  "mao": number,
  "arv_confidence": "high|medium|low",
  "price_per_sqft_estimate": number,
  "reasoning": "2-3 sentence explanation"
}`
  );

  return extractText(result);
}

async function runMarketAgent(deal: Deal): Promise<string> {
  const result = await callClaude(
    [{ role: 'user', content: dealContext(deal) }],
    `You are the Market Agent — a real estate market analyst. Evaluate the market conditions for this property:

1. MARKET SCORE (0-100) based on the location's investment potential
2. LOCATION SCORE (0-100) based on neighborhood desirability, growth trends
3. DEMAND ASSESSMENT for this property type in this market
4. RENTAL POTENTIAL estimate if this were a rental property

Consider: city/state economic fundamentals, property type demand, typical rent-to-price ratios for the area.

Respond in JSON format:
{
  "market_score": number,
  "location_score": number,
  "demand_level": "high|medium|low",
  "estimated_monthly_rent": number,
  "cap_rate_estimate": number,
  "reasoning": "2-3 sentence market assessment"
}`
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
}`
  );

  return extractText(result);
}

async function runChiefAgent(
  deal: Deal,
  arvReport: string,
  marketReport: string,
  riskReport: string
): Promise<string> {
  const result = await callClaude(
    [{ role: 'user', content: `DEAL:
${dealContext(deal)}

ARV AGENT REPORT:
${arvReport}

MARKET AGENT REPORT:
${marketReport}

RISK AGENT REPORT:
${riskReport}` }],
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
}`
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

export async function evaluateDeal(deal: Deal): Promise<DealEvaluation> {
  // Run three agents in parallel (debate architecture)
  const [arvReport, marketReport, riskReport] = await Promise.all([
    runARVAgent(deal),
    runMarketAgent(deal),
    runRiskAgent(deal),
  ]);

  // Chief agent synthesizes
  const chiefReport = await runChiefAgent(deal, arvReport, marketReport, riskReport);
  const chief = parseJSON(chiefReport);

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
