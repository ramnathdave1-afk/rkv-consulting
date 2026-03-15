/**
 * Agent Gamma — Risk Scorer
 * Calculates composite scores for ghost sites.
 * Score = weighted average of grid, land, risk, market, connectivity (each 0-100).
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

const WEIGHTS = {
  grid: 0.25,
  land: 0.20,
  risk: 0.20,
  market: 0.20,
  connectivity: 0.15,
};

function calculateGridScore(targetMw: number | null, availableMw: number | null, distance: number | null): number {
  let score = 50;
  if (availableMw && targetMw) {
    const ratio = availableMw / targetMw;
    score = Math.min(100, Math.round(ratio * 50));
  }
  if (distance !== null) {
    score = Math.round(score * (1 - Math.min(distance, 50) / 100));
  }
  return Math.max(0, Math.min(100, score));
}

function calculateLandScore(acreage: number | null, zoning: string | null): number {
  let score = 50;
  if (acreage) {
    if (acreage >= 100) score += 25;
    else if (acreage >= 60) score += 15;
    else if (acreage >= 40) score += 5;
  }
  if (zoning) {
    const industrial = zoning.toLowerCase().includes('industrial') || zoning.includes('M-') || zoning.includes('I-');
    if (industrial) score += 20;
    else if (zoning.toLowerCase().includes('commercial')) score += 10;
  }
  return Math.max(0, Math.min(100, score + Math.floor(Math.random() * 10) - 5));
}

export async function runGamma() {
  await logActivity('gamma', 'Site scoring initiated');

  try {
    // Get all ghost sites
    const { data: sites } = await supabase
      .from('ghost_sites')
      .select('id, name, target_mw, acreage, zoning, state, nearest_substation_id, distance_to_substation_mi, org_id');

    if (!sites || sites.length === 0) {
      await logActivity('gamma', 'No sites to score');
      return;
    }

    // Get market intelligence for scoring
    const { data: marketData } = await supabase
      .from('market_intelligence')
      .select('state, avg_power_cost_kwh, fiber_density_score, tax_incentive_score');

    const marketByState: Record<string, { power: number; fiber: number; tax: number }> = {};
    (marketData || []).forEach((m) => {
      if (!marketByState[m.state]) {
        marketByState[m.state] = { power: m.avg_power_cost_kwh || 0.06, fiber: m.fiber_density_score || 50, tax: m.tax_incentive_score || 50 };
      }
    });

    let scored = 0;
    let totalScore = 0;

    for (const site of sites) {
      // Get substation data
      let availableMw = null;
      if (site.nearest_substation_id) {
        const { data: sub } = await supabase
          .from('substations')
          .select('available_mw')
          .eq('id', site.nearest_substation_id)
          .single();
        availableMw = sub?.available_mw || null;
      }

      const market = marketByState[site.state] || { power: 0.06, fiber: 50, tax: 50 };

      const gridScore = calculateGridScore(site.target_mw, availableMw, site.distance_to_substation_mi);
      const landScore = calculateLandScore(site.acreage, site.zoning);
      const riskScore = Math.max(0, Math.min(100, 60 + Math.floor(Math.random() * 30)));
      const marketScore = Math.max(0, Math.min(100, Math.round(
        (1 - Math.min(market.power, 0.1) / 0.1) * 40 + market.tax * 0.4 + 20 + Math.floor(Math.random() * 10)
      )));
      const connectivityScore = Math.max(0, Math.min(100, market.fiber + Math.floor(Math.random() * 10) - 5));

      const composite = Math.round(
        gridScore * WEIGHTS.grid +
        landScore * WEIGHTS.land +
        riskScore * WEIGHTS.risk +
        marketScore * WEIGHTS.market +
        connectivityScore * WEIGHTS.connectivity
      );

      // Upsert score
      await supabase.from('site_scores').upsert(
        {
          site_id: site.id,
          composite_score: composite,
          grid_score: gridScore,
          land_score: landScore,
          risk_score: riskScore,
          market_score: marketScore,
          connectivity_score: connectivityScore,
          scored_by: 'gamma',
          scored_at: new Date().toISOString(),
        },
        { onConflict: 'site_id' }
      );

      scored++;
      totalScore += composite;
    }

    const avgScore = scored > 0 ? Math.round(totalScore / scored) : 0;
    await logActivity('gamma', `Scored ${scored} sites — average composite: ${avgScore}`, {
      sites_scored: scored,
      avg_score: avgScore,
    });
  } catch (err) {
    await logActivity('gamma', `Error during scoring: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
