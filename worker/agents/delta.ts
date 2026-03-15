/**
 * Agent Delta — Market Intelligence
 * Collects regional power cost, land cost, and tax incentive data.
 * In mock mode: updates market_intelligence with realistic synthetic data.
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

interface MarketUpdate {
  region: string;
  state: string;
  avg_power_cost_kwh: number;
  avg_land_cost_acre: number;
  tax_incentive_score: number;
  fiber_density_score: number;
}

const MARKET_DATA: MarketUpdate[] = [
  { region: 'Northern Virginia', state: 'VA', avg_power_cost_kwh: 0.068, avg_land_cost_acre: 85000, tax_incentive_score: 72, fiber_density_score: 95 },
  { region: 'Central Virginia', state: 'VA', avg_power_cost_kwh: 0.062, avg_land_cost_acre: 35000, tax_incentive_score: 68, fiber_density_score: 65 },
  { region: 'Baltimore Metro', state: 'MD', avg_power_cost_kwh: 0.071, avg_land_cost_acre: 62000, tax_incentive_score: 65, fiber_density_score: 82 },
  { region: 'Philadelphia Metro', state: 'PA', avg_power_cost_kwh: 0.073, avg_land_cost_acre: 78000, tax_incentive_score: 60, fiber_density_score: 88 },
  { region: 'Central Pennsylvania', state: 'PA', avg_power_cost_kwh: 0.058, avg_land_cost_acre: 22000, tax_incentive_score: 75, fiber_density_score: 45 },
  { region: 'Northern New Jersey', state: 'NJ', avg_power_cost_kwh: 0.082, avg_land_cost_acre: 120000, tax_incentive_score: 55, fiber_density_score: 92 },
  { region: 'Central Ohio', state: 'OH', avg_power_cost_kwh: 0.052, avg_land_cost_acre: 18000, tax_incentive_score: 80, fiber_density_score: 70 },
  { region: 'West Virginia', state: 'WV', avg_power_cost_kwh: 0.048, avg_land_cost_acre: 8000, tax_incentive_score: 85, fiber_density_score: 35 },
  { region: 'Delaware', state: 'DE', avg_power_cost_kwh: 0.065, avg_land_cost_acre: 32000, tax_incentive_score: 88, fiber_density_score: 60 },
  { region: 'Indiana', state: 'IN', avg_power_cost_kwh: 0.055, avg_land_cost_acre: 15000, tax_incentive_score: 78, fiber_density_score: 55 },
  { region: 'Northern Illinois', state: 'IL', avg_power_cost_kwh: 0.068, avg_land_cost_acre: 45000, tax_incentive_score: 62, fiber_density_score: 90 },
];

export async function runDelta() {
  await logActivity('delta', 'Market intelligence collection initiated');

  try {
    let updated = 0;

    for (const market of MARKET_DATA) {
      // Simulate small market fluctuations
      const powerDelta = (Math.random() - 0.5) * 0.004;
      const landDelta = (Math.random() - 0.5) * 5000;

      const updatedPower = Math.round((market.avg_power_cost_kwh + powerDelta) * 1000) / 1000;
      const updatedLand = Math.round(market.avg_land_cost_acre + landDelta);

      await supabase.from('market_intelligence').upsert(
        {
          region: market.region,
          state: market.state,
          avg_power_cost_kwh: updatedPower,
          avg_land_cost_acre: updatedLand,
          tax_incentive_score: market.tax_incentive_score,
          fiber_density_score: market.fiber_density_score,
          collected_at: new Date().toISOString(),
          data: { source: 'delta_agent', iteration: Date.now() },
        },
        { onConflict: 'region' }
      );

      updated++;
    }

    // Log summary for a few key regions
    const highlights = MARKET_DATA.slice(0, 3);
    for (const h of highlights) {
      await logActivity('delta', `${h.region}: $${h.avg_power_cost_kwh}/kWh power, $${(h.avg_land_cost_acre / 1000).toFixed(0)}K/acre land, tax score: ${h.tax_incentive_score}`, {
        region: h.region,
        state: h.state,
        power_kwh: h.avg_power_cost_kwh,
        land_acre: h.avg_land_cost_acre,
      });
    }

    await logActivity('delta', `Market intelligence updated for ${updated} regions`, {
      regions_updated: updated,
    });
  } catch (err) {
    await logActivity('delta', `Error during market collection: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
