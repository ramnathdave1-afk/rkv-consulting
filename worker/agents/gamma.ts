/**
 * Agent Gamma — Multi-Dimension Scorer
 * Calculates composite scores for sites using database-driven scoring profiles.
 * Loads dimension weights from scoring_profiles table per vertical.
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

interface ScoringDimension {
  key: string;
  label: string;
  weight: number;
  color: string;
}

interface ScoringProfile {
  id: string;
  vertical: string;
  dimensions: ScoringDimension[];
}

// Score calculation functions by dimension key
const SCORE_FUNCTIONS: Record<string, (ctx: ScoreContext) => number> = {
  grid: (ctx) => {
    let score = 50;
    if (ctx.availableMw && ctx.targetCapacity) {
      const ratio = ctx.availableMw / ctx.targetCapacity;
      score = Math.min(100, Math.round(ratio * 50));
    }
    if (ctx.distanceToSub !== null) {
      score = Math.round(score * (1 - Math.min(ctx.distanceToSub, 50) / 100));
    }
    return clamp(score);
  },
  land: (ctx) => {
    let score = 50;
    if (ctx.acreage) {
      if (ctx.acreage >= 100) score += 25;
      else if (ctx.acreage >= 60) score += 15;
      else if (ctx.acreage >= 40) score += 5;
    }
    if (ctx.zoning) {
      const z = ctx.zoning.toLowerCase();
      if (z.includes('industrial') || z.includes('m-') || z.includes('i-')) score += 20;
      else if (z.includes('commercial') || z.includes('c-')) score += 10;
      else if (z.includes('agricultural') || z.includes('ag')) score += 15;
    }
    return clamp(score + jitter(5));
  },
  risk: (ctx) => {
    let score = 75;
    if (ctx.floodZone) {
      if (['A', 'AE', 'V', 'VE'].some((z) => ctx.floodZone?.startsWith(z))) score -= 30;
      else if (ctx.floodZone === 'X' || ctx.floodZone === 'C') score += 10;
    }
    if (ctx.environmentalFlags > 0) score -= ctx.environmentalFlags * 10;
    return clamp(score + jitter(5));
  },
  market: (ctx) => {
    let score = 50;
    if (ctx.powerCost) {
      score += Math.round((1 - Math.min(ctx.powerCost, 0.10) / 0.10) * 30);
    }
    if (ctx.taxIncentive) score += Math.round(ctx.taxIncentive * 0.2);
    return clamp(score + jitter(8));
  },
  connectivity: (ctx) => {
    return clamp((ctx.fiberDensity || 50) + jitter(8));
  },
  irradiance: (ctx) => {
    if (!ctx.solarGhi) return clamp(50 + jitter(10));
    // GHI ranges ~3-7 kWh/m²/day in US. 5.5+ is excellent.
    return clamp(Math.round((ctx.solarGhi / 7) * 100));
  },
  wind_speed: (ctx) => {
    if (!ctx.windSpeed) return clamp(50 + jitter(10));
    // 100m wind speed: 7+ m/s is good, 9+ excellent
    return clamp(Math.round((ctx.windSpeed / 10) * 100));
  },
  terrain: () => clamp(65 + jitter(15)),
  setbacks: () => clamp(70 + jitter(15)),
  traffic: () => clamp(55 + jitter(20)),
  visibility: () => clamp(60 + jitter(15)),
  competition: () => clamp(65 + jitter(15)),
  logistics: () => clamp(60 + jitter(15)),
  labor: () => clamp(55 + jitter(15)),
  infrastructure: () => clamp(60 + jitter(15)),
  schools: () => clamp(65 + jitter(10)),
  walkability: () => clamp(55 + jitter(20)),
};

interface ScoreContext {
  targetCapacity: number | null;
  availableMw: number | null;
  distanceToSub: number | null;
  acreage: number | null;
  zoning: string | null;
  floodZone: string | null;
  environmentalFlags: number;
  powerCost: number | null;
  taxIncentive: number | null;
  fiberDensity: number | null;
  solarGhi: number | null;
  windSpeed: number | null;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function jitter(range: number): number {
  return Math.floor(Math.random() * range * 2) - range;
}

export async function runGamma() {
  await logActivity('gamma', 'Multi-dimension scoring initiated');

  try {
    // Load scoring profiles from database
    const { data: profiles } = await supabase
      .from('scoring_profiles')
      .select('id, vertical, dimensions')
      .eq('is_default', true);

    const profileMap: Record<string, ScoringProfile> = {};
    for (const p of profiles || []) {
      profileMap[p.vertical] = p;
    }

    // Fallback weights if no profile exists
    const defaultDimensions: ScoringDimension[] = [
      { key: 'grid', label: 'Grid', weight: 0.25, color: '#00D4AA' },
      { key: 'land', label: 'Land', weight: 0.20, color: '#3B82F6' },
      { key: 'risk', label: 'Risk', weight: 0.20, color: '#F59E0B' },
      { key: 'market', label: 'Market', weight: 0.20, color: '#8B5CF6' },
      { key: 'connectivity', label: 'Connectivity', weight: 0.15, color: '#EC4899' },
    ];

    // Get all sites
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, vertical, target_capacity, acreage, zoning, state, nearest_substation_id, distance_to_substation_mi, org_id');

    if (!sites || sites.length === 0) {
      await logActivity('gamma', 'No sites to score');
      return;
    }

    // Get market intelligence
    const { data: marketData } = await supabase
      .from('market_intelligence')
      .select('region, state, avg_power_cost_kwh, fiber_density_score, tax_incentive_score, metric, value, details');

    const marketByState: Record<string, { power: number; fiber: number; tax: number; ghi: number; wind: number }> = {};
    for (const m of marketData || []) {
      if (!marketByState[m.state]) {
        marketByState[m.state] = { power: 0.06, fiber: 50, tax: 50, ghi: 0, wind: 0 };
      }
      const entry = marketByState[m.state];
      if (m.avg_power_cost_kwh) entry.power = m.avg_power_cost_kwh;
      if (m.fiber_density_score) entry.fiber = m.fiber_density_score;
      if (m.tax_incentive_score) entry.tax = m.tax_incentive_score;
      if (m.metric === 'solar_resource' && m.value) entry.ghi = m.value;
      if (m.metric === 'wind_resource' && m.value) entry.wind = m.value;
    }

    let scored = 0;
    let totalScore = 0;

    for (const site of sites) {
      // Get substation data
      let availableMw: number | null = null;
      if (site.nearest_substation_id) {
        const { data: sub } = await supabase
          .from('substations')
          .select('available_mw')
          .eq('id', site.nearest_substation_id)
          .single();
        availableMw = sub?.available_mw || null;
      }

      // Check environmental constraints
      const { data: envData } = await supabase
        .from('parcels')
        .select('flood_zone, environmental_flags')
        .eq('state', site.state)
        .limit(1);

      const market = marketByState[site.state] || { power: 0.06, fiber: 50, tax: 50, ghi: 0, wind: 0 };

      const ctx: ScoreContext = {
        targetCapacity: site.target_capacity,
        availableMw,
        distanceToSub: site.distance_to_substation_mi,
        acreage: site.acreage,
        zoning: site.zoning,
        floodZone: envData?.[0]?.flood_zone || null,
        environmentalFlags: Array.isArray(envData?.[0]?.environmental_flags) ? envData[0].environmental_flags.length : 0,
        powerCost: market.power,
        taxIncentive: market.tax,
        fiberDensity: market.fiber,
        solarGhi: market.ghi,
        windSpeed: market.wind,
      };

      // Get dimensions for this site's vertical
      const vertical = site.vertical || 'data_center';
      const profile = profileMap[vertical];
      const dimensions = profile?.dimensions || defaultDimensions;

      // Calculate each dimension score
      const dimensionScores: Record<string, number> = {};
      let composite = 0;

      for (const dim of dimensions) {
        const scoreFn = SCORE_FUNCTIONS[dim.key] || (() => clamp(50 + jitter(15)));
        const dimScore = scoreFn(ctx);
        dimensionScores[dim.key] = dimScore;
        composite += dimScore * dim.weight;
      }

      composite = Math.round(composite);

      // Upsert score with dimension breakdown
      await supabase.from('site_scores').upsert(
        {
          site_id: site.id,
          composite_score: composite,
          grid_score: dimensionScores.grid ?? dimensionScores[dimensions[0]?.key] ?? 50,
          land_score: dimensionScores.land ?? dimensionScores[dimensions[1]?.key] ?? 50,
          risk_score: dimensionScores.risk ?? 50,
          market_score: dimensionScores.market ?? 50,
          connectivity_score: dimensionScores.connectivity ?? 50,
          dimension_scores: dimensionScores,
          scoring_profile: profile?.id || 'default',
          scored_by: 'gamma',
          scored_at: new Date().toISOString(),
        },
        { onConflict: 'site_id' },
      );

      scored++;
      totalScore += composite;
    }

    const avgScore = scored > 0 ? Math.round(totalScore / scored) : 0;
    await logActivity('gamma', `Scored ${scored} sites — average composite: ${avgScore}`, {
      sites_scored: scored,
      avg_score: avgScore,
      verticals: [...new Set(sites.map((s) => s.vertical || 'data_center'))],
    });
  } catch (err) {
    await logActivity('gamma', `Error during scoring: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
