/**
 * Agent Alpha — Infrastructure Scanner
 * Scans substations for available capacity headroom across all ISO regions.
 * In mock mode: generates realistic synthetic substation data.
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

// All US states — no longer limited to PJM territory
const SCAN_STATES = [
  'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
  'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
];

export async function runAlpha() {
  await logActivity('alpha', 'Infrastructure scan initiated');

  try {
    // Check existing substations
    const { data: substations, error } = await supabase
      .from('substations')
      .select('id, name, state, capacity_mw, available_mw')
      .order('available_mw', { ascending: false });

    if (error) throw error;

    const highCapacity = (substations || []).filter((s) => (s.available_mw || 0) > 200);

    await logActivity('alpha', `Found ${highCapacity.length} substations with >200MW available headroom`, {
      total_substations: substations?.length || 0,
      high_capacity: highCapacity.length,
      states_covered: [...new Set(substations?.map((s) => s.state) || [])],
    });

    // Note: Synthetic capacity fluctuation removed.
    // Real capacity data should come from EIA API or utility interconnection queues.
    // Alpha now focuses on reporting existing infrastructure state.

    // Report capacity distribution by state
    const stateCapacity: Record<string, { count: number; totalMw: number }> = {};
    for (const sub of substations || []) {
      if (!stateCapacity[sub.state]) stateCapacity[sub.state] = { count: 0, totalMw: 0 };
      stateCapacity[sub.state].count++;
      stateCapacity[sub.state].totalMw += sub.available_mw || 0;
    }

    const topStates = Object.entries(stateCapacity)
      .sort((a, b) => b[1].totalMw - a[1].totalMw)
      .slice(0, 5);

    for (const [state, info] of topStates) {
      await logActivity('alpha', `${state}: ${info.count} substations, ${info.totalMw}MW total available capacity`, {
        state,
        substations: info.count,
        total_available_mw: info.totalMw,
      });
    }

    await logActivity('alpha', 'Infrastructure scan complete');
  } catch (err) {
    await logActivity('alpha', `Error during scan: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
