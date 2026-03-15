/**
 * Agent Alpha — Grid Scanner
 * Scans PJM substations for available MW headroom.
 * In mock mode: generates realistic synthetic substation data.
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

const PJM_STATES = ['VA', 'MD', 'PA', 'NJ', 'OH', 'WV', 'DE', 'IN', 'IL'];

export async function runAlpha() {
  await logActivity('alpha', 'Grid scan initiated across PJM territory');

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
    for (const state of PJM_STATES.slice(0, 3)) {
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

    await logActivity('alpha', 'Grid scan complete');
  } catch (err) {
    await logActivity('alpha', `Error during grid scan: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
