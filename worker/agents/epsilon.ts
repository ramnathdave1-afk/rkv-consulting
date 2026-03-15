/**
 * Agent Epsilon — Feasibility Analyzer
 * Runs scheduled feasibility analysis on sites.
 * Simplified version for the worker context (no @/ path aliases).
 */

import { supabase } from '../lib/supabase.js';
import { logActivity } from '../lib/logger.js';

interface FeasibilityDimension {
  name: string;
  status: 'pass' | 'conditional' | 'fail';
  score: number;
  details: string;
}

export async function runEpsilon() {
  await logActivity('epsilon', 'Feasibility analysis initiated');

  try {
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, state, county, lat, lng, vertical, target_capacity, acreage, zoning, nearest_substation_id, distance_to_substation_mi, org_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!sites || sites.length === 0) {
      await logActivity('epsilon', 'No sites pending feasibility analysis');
      return;
    }

    let analyzed = 0;

    for (const site of sites) {
      const vertical = site.vertical || 'data_center';
      const dimensions: FeasibilityDimension[] = [];

      // 1. Zoning check
      const zoning = site.zoning || 'Unknown';
      const z = zoning.toLowerCase();
      const zoningCompat: Record<string, string[]> = {
        data_center: ['industrial', 'commercial'], solar: ['agricultural', 'industrial'],
        wind: ['agricultural', 'industrial'], ev_charging: ['commercial', 'industrial'],
        industrial: ['industrial'], residential: ['residential'], mixed_use: ['mixed_use', 'commercial'],
      };
      const required = zoningCompat[vertical] || ['industrial'];
      const cat = /industrial|m-|i-/.test(z) ? 'industrial' : /commercial|c-/.test(z) ? 'commercial' : /residential|r-/.test(z) ? 'residential' : /ag/.test(z) ? 'agricultural' : 'other';
      const zoningOk = required.includes(cat);
      dimensions.push({
        name: 'Zoning', status: zoningOk ? 'pass' : 'fail',
        score: zoningOk ? 85 : 20, details: zoningOk ? `Zoning ${zoning} compatible with ${vertical}` : `Zoning ${zoning} incompatible with ${vertical}`,
      });

      // 2. Grid access
      const dist = site.distance_to_substation_mi;
      const maxDist: Record<string, number> = { data_center: 10, solar: 20, wind: 25, ev_charging: 5, industrial: 15, residential: 20, mixed_use: 10 };
      const threshold = maxDist[vertical] || 15;

      let availableMw: number | null = null;
      if (site.nearest_substation_id) {
        const { data: sub } = await supabase.from('substations').select('available_mw').eq('id', site.nearest_substation_id).single();
        availableMw = sub?.available_mw || null;
      }

      if (dist !== null && dist !== undefined && dist <= threshold && availableMw && availableMw > 50) {
        dimensions.push({ name: 'Grid Access', status: 'pass', score: 85, details: `Substation ${dist.toFixed(1)} mi away with ${availableMw}MW available` });
      } else if (dist !== null && dist !== undefined && dist <= threshold * 2) {
        dimensions.push({ name: 'Grid Access', status: 'conditional', score: 50, details: `Nearest substation ${dist?.toFixed(1) || '?'} mi away. Interconnection study recommended` });
      } else {
        dimensions.push({ name: 'Grid Access', status: 'conditional', score: 45, details: 'Grid access data limited. Interconnection study required' });
      }

      // 3. Land suitability
      const minAcres: Record<string, number> = { data_center: 20, solar: 40, wind: 100, ev_charging: 0.5, industrial: 10, residential: 5, mixed_use: 2 };
      const reqAcres = minAcres[vertical] || 10;
      const acres = site.acreage || 0;
      if (acres >= reqAcres) {
        dimensions.push({ name: 'Land Suitability', status: 'pass', score: acres >= reqAcres * 1.5 ? 90 : 70, details: `${acres} acres meets ${reqAcres} acre minimum for ${vertical}` });
      } else if (acres >= reqAcres * 0.5) {
        dimensions.push({ name: 'Land Suitability', status: 'conditional', score: 40, details: `${acres} acres below ${reqAcres} acre minimum. Reduced capacity possible` });
      } else {
        dimensions.push({ name: 'Land Suitability', status: 'fail', score: 10, details: `${acres} acres insufficient for ${vertical} (${reqAcres} acres required)` });
      }

      // 4. Environmental (check database)
      const { data: envLayers } = await supabase
        .from('environmental_layers')
        .select('layer_type, severity')
        .eq('state', site.state)
        .limit(5);

      const highSeverity = (envLayers || []).filter((e) => e.severity === 'high');
      if (highSeverity.length > 0) {
        dimensions.push({ name: 'Environmental', status: 'fail', score: 15, details: `High-severity constraints: ${highSeverity.map((e) => e.layer_type).join(', ')}` });
      } else if ((envLayers || []).some((e) => e.severity === 'moderate')) {
        dimensions.push({ name: 'Environmental', status: 'conditional', score: 55, details: 'Moderate environmental constraints. Mitigation may be required' });
      } else {
        dimensions.push({ name: 'Environmental', status: 'pass', score: 80, details: 'No significant environmental constraints' });
      }

      // 5. Infrastructure
      const { data: infra } = await supabase
        .from('market_intelligence')
        .select('metric, value')
        .eq('state', site.state)
        .in('metric', ['road_density', 'fiber_density'])
        .limit(5);

      const hasInfra = (infra || []).length > 0;
      dimensions.push({
        name: 'Infrastructure', status: hasInfra ? 'pass' : 'conditional',
        score: hasInfra ? 70 : 55, details: hasInfra ? 'Infrastructure data available' : 'Utility survey recommended',
      });

      // Calculate verdict
      const scores = dimensions.map((d) => d.score);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const failCount = dimensions.filter((d) => d.status === 'fail').length;
      const condCount = dimensions.filter((d) => d.status === 'conditional').length;
      const verdict = failCount >= 2 ? 'infeasible' : failCount === 1 || condCount >= 2 ? 'conditional' : 'feasible';

      await logActivity('epsilon',
        `${site.name}: ${verdict.toUpperCase()} (score: ${avgScore}/100)`,
        { site_id: site.id, verdict, score: avgScore, dimensions },
        site.org_id,
        site.id,
      );

      analyzed++;
    }

    await logActivity('epsilon', `Feasibility analysis complete — ${analyzed} sites analyzed`);
  } catch (err) {
    await logActivity('epsilon', `Error: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}
