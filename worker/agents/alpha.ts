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

    // Simulate discovering updated capacity data
    const statesToScan = SCAN_STATES.filter((state) =>
      (substations || []).some((s) => s.state === state),
    ).slice(0, 5);

    for (const state of statesToScan) {
      const stateSubstations = (substations || []).filter((s) => s.state === state);
      if (stateSubstations.length > 0) {
        // Simulate small capacity fluctuations
        const sub = stateSubstations[Math.floor(Math.random() * stateSubstations.length)];
        const delta = Math.floor(Math.random() * 40) - 20; // -20 to +20 MW
        const newAvailable = Math.max(0, (sub.available_mw || 0) + delta);

        await supabase
          .from('substations')
          .update({ available_mw: newAvailable })
          .eq('id', sub.id);

        await logActivity('alpha', `Updated ${sub.name} available capacity: ${newAvailable}MW (${delta >= 0 ? '+' : ''}${delta}MW)`, {
          substation: sub.name,
          previous: sub.available_mw,
          new: newAvailable,
          delta,
        });
      }
    }

    await logActivity('alpha', 'Infrastructure scan complete');
  } catch (err) {
    await logActivity('alpha', `Error during scan: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
