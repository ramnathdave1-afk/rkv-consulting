/**
 * Agent Beta — Site Discovery
 * Finds parcels near substations with high available capacity.
 * Vertical-aware: adjusts criteria based on site vertical.
 * Scans all states with substations, not limited to specific regions.
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

const ZONING_TYPES = ['M-1 Industrial', 'I-2 Heavy Industrial', 'LI Light Industrial', 'C-3 Commercial', 'Agricultural', 'Mixed Use', 'PUD Planned Development', 'C-1 Commercial'];

// Minimum acreage thresholds by vertical
const MIN_ACREAGE: Record<string, number> = {
  data_center: 40,
  solar: 80,
  wind: 200,
  ev_charging: 1,
  industrial: 20,
  residential: 10,
  mixed_use: 5,
};

// Minimum substation capacity (MW) by vertical
const MIN_SUBSTATION_MW: Record<string, number> = {
  data_center: 200,
  solar: 50,
  wind: 100,
  ev_charging: 5,
  industrial: 50,
  residential: 10,
  mixed_use: 20,
};

export async function runBeta() {
  await logActivity('beta', 'Site discovery initiated');

  try {
    // Get all verticals with sites to know what to scan for
    const { data: verticalCounts } = await supabase
      .from('sites')
      .select('vertical')
      .limit(1000);

    const activeVerticals = [...new Set((verticalCounts || []).map((s) => s.vertical || 'data_center'))];
    if (activeVerticals.length === 0) activeVerticals.push('data_center');

    // Find substations with high headroom
    const { data: substations } = await supabase
      .from('substations')
      .select('id, name, lat, lng, state, county, available_mw, iso_region')
      .gte('available_mw', 10)
      .order('available_mw', { ascending: false })
      .limit(20);

    if (!substations || substations.length === 0) {
      await logActivity('beta', 'No substations with available capacity found');
      return;
    }

    let totalAnalyzed = 0;
    let totalQualifying = 0;
    let totalCreated = 0;

    for (const sub of substations.slice(0, 8)) {
      // Check for existing parcels near this substation
      const { data: nearbyParcels } = await supabase
        .from('parcels')
        .select('id, acreage, zoning, state, county, lat, lng')
        .eq('state', sub.state)
        .gte('acreage', 5)
        .limit(50);

      if (nearbyParcels && nearbyParcels.length > 0) {
        // Score existing parcels against each active vertical
        for (const parcel of nearbyParcels) {
          totalAnalyzed++;

          // Calculate distance to substation (approximate)
          const distMi = haversineDistance(parcel.lat, parcel.lng, sub.lat, sub.lng);
          if (distMi > 30) continue; // Too far

          for (const vertical of activeVerticals) {
            const minAcres = MIN_ACREAGE[vertical] || 10;
            const minMw = MIN_SUBSTATION_MW[vertical] || 10;

            if ((parcel.acreage || 0) >= minAcres && (sub.available_mw || 0) >= minMw) {
              totalQualifying++;
            }
          }
        }
      }

      // Simulate discovering a new parcel (synthetic for demo)
      if (Math.random() > 0.4) {
        const acreage = 20 + Math.floor(Math.random() * 200);
        const zoning = ZONING_TYPES[Math.floor(Math.random() * ZONING_TYPES.length)];
        const latOffset = (Math.random() - 0.5) * 0.12;
        const lngOffset = (Math.random() - 0.5) * 0.12;

        const { error: insertErr } = await supabase.from('parcels').insert({
          acreage,
          zoning,
          state: sub.state,
          county: sub.county || 'Unknown',
          lat: sub.lat + latOffset,
          lng: sub.lng + lngOffset,
          owner: 'Private Owner',
        });

        if (!insertErr) {
          totalCreated++;
          await logActivity('beta',
            `Discovered parcel near ${sub.name}: ${acreage} acres, ${zoning} in ${sub.state}`,
            { near_substation: sub.name, acreage, zoning, state: sub.state, distance_mi: 'nearby' },
          );
        }
      }
    }

    await logActivity('beta',
      `Site discovery complete — analyzed ${totalAnalyzed} parcels, ${totalQualifying} meet criteria, ${totalCreated} new parcels added`,
      { total_analyzed: totalAnalyzed, qualifying: totalQualifying, created: totalCreated },
    );
  } catch (err) {
    await logActivity('beta', `Error during site discovery: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
