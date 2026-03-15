/**
 * Agent Beta — Parcel Analyzer
 * Finds parcels >40 acres near substations with high available MW.
 * In mock mode: generates synthetic parcel discoveries.
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

const ZONING_TYPES = ['M-1 Industrial', 'I-2 Heavy Industrial', 'LI Light Industrial', 'C-3 Commercial', 'Agricultural', 'Mixed Use'];
const COUNTIES: Record<string, string[]> = {
  VA: ['Loudoun', 'Prince William', 'Fauquier', 'Culpeper', 'Henrico', 'Spotsylvania'],
  MD: ['Baltimore', 'Frederick', 'Prince George', 'Anne Arundel', 'Howard'],
  PA: ['Montgomery', 'Lancaster', 'Dauphin', 'Lehigh', 'Chester'],
  OH: ['Franklin', 'Cuyahoga', 'Montgomery', 'Summit', 'Hamilton'],
};

export async function runBeta() {
  await logActivity('beta', 'Parcel analysis initiated');

  try {
    // Find substations with high headroom
    const { data: substations } = await supabase
      .from('substations')
      .select('id, name, lat, lng, state, available_mw')
      .gte('available_mw', 200)
      .order('available_mw', { ascending: false })
      .limit(10);

    if (!substations || substations.length === 0) {
      await logActivity('beta', 'No high-capacity substations found for parcel analysis');
      return;
    }

    let totalAnalyzed = 0;
    let totalQualifying = 0;

    for (const sub of substations.slice(0, 5)) {
      const analyzed = 8 + Math.floor(Math.random() * 20);
      const qualifying = Math.floor(analyzed * (0.15 + Math.random() * 0.25));
      totalAnalyzed += analyzed;
      totalQualifying += qualifying;

      // Simulate finding new parcels near this substation
      if (qualifying > 0 && Math.random() > 0.5) {
        const counties = COUNTIES[sub.state] || ['Unknown'];
        const county = counties[Math.floor(Math.random() * counties.length)];
        const acreage = 40 + Math.floor(Math.random() * 160);
        const zoning = ZONING_TYPES[Math.floor(Math.random() * ZONING_TYPES.length)];

        // Offset from substation by a small random distance
        const latOffset = (Math.random() - 0.5) * 0.15;
        const lngOffset = (Math.random() - 0.5) * 0.15;

        await supabase.from('parcels').insert({
          acreage,
          zoning,
          state: sub.state,
          county,
          lat: sub.lat + latOffset,
          lng: sub.lng + lngOffset,
          owner: 'Private Owner',
        });

        await logActivity('beta', `New parcel found near ${sub.name}: ${acreage} acres, ${zoning} zoning in ${county}`, {
          near_substation: sub.name,
          acreage,
          zoning,
          county,
          state: sub.state,
        });
      }
    }

    await logActivity('beta', `Parcel analysis complete — analyzed ${totalAnalyzed} parcels, ${totalQualifying} meet criteria`, {
      total_analyzed: totalAnalyzed,
      qualifying: totalQualifying,
    });
  } catch (err) {
    await logActivity('beta', `Error during parcel analysis: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
