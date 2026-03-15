/**
 * Feasibility Analyzer — Shared logic for both worker agent and API routes.
 *
 * Cross-references zoning, environmental, grid access, and infrastructure
 * to produce a structured feasibility verdict.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface FeasibilityDimension {
  name: string;
  status: 'pass' | 'conditional' | 'fail';
  score: number;
  details: string;
}

export interface FeasibilityResult {
  parcel_id: string;
  site_id?: string;
  vertical: string;
  overall_verdict: 'feasible' | 'conditional' | 'infeasible';
  overall_score: number;
  dimensions: FeasibilityDimension[];
  summary: string;
  recommendations: string[];
  analyzed_at: string;
}

export interface FeasibilitySite {
  id: string;
  name: string;
  state: string;
  county?: string;
  lat: number;
  lng: number;
  vertical?: string;
  target_capacity?: number;
  acreage?: number;
  zoning?: string;
  nearest_substation_id?: string;
  distance_to_substation_mi?: number;
  org_id?: string;
}

export async function analyzeFeasibility(site: FeasibilitySite): Promise<FeasibilityResult> {
  const vertical = site.vertical || 'data_center';
  const dimensions: FeasibilityDimension[] = [];
  const recommendations: string[] = [];

  // 1. Zoning
  const zoningResult = await analyzeZoning(site, vertical);
  dimensions.push(zoningResult);
  if (zoningResult.status !== 'pass') recommendations.push(zoningResult.details);

  // 2. Environmental
  const envResult = await analyzeEnvironmental(site);
  dimensions.push(envResult);
  if (envResult.status !== 'pass') recommendations.push(envResult.details);

  // 3. Grid Access
  const gridResult = await analyzeGridAccess(site, vertical);
  dimensions.push(gridResult);
  if (gridResult.status !== 'pass') recommendations.push(gridResult.details);

  // 4. Infrastructure
  const infraResult = await analyzeInfrastructure(site, vertical);
  dimensions.push(infraResult);
  if (infraResult.status !== 'pass') recommendations.push(infraResult.details);

  // 5. Land Suitability
  const landResult = analyzeLand(site, vertical);
  dimensions.push(landResult);
  if (landResult.status !== 'pass') recommendations.push(landResult.details);

  // Calculate overall
  const scores = dimensions.map((d) => d.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const failCount = dimensions.filter((d) => d.status === 'fail').length;
  const conditionalCount = dimensions.filter((d) => d.status === 'conditional').length;

  let verdict: 'feasible' | 'conditional' | 'infeasible';
  if (failCount >= 2) verdict = 'infeasible';
  else if (failCount === 1 || conditionalCount >= 2) verdict = 'conditional';
  else verdict = 'feasible';

  const passCount = dimensions.filter((d) => d.status === 'pass').length;
  const total = dimensions.length;
  const verdictText = verdict === 'feasible' ? 'appears feasible' : verdict === 'conditional' ? 'is conditionally feasible' : 'faces significant obstacles';
  const summary = `${vertical.replace('_', ' ')} development at ${site.name} (${site.state}, ${site.acreage || '?'} acres) ${verdictText}. ${passCount}/${total} dimensions pass. ${dimensions.filter((d) => d.status === 'fail').map((d) => `${d.name} is a blocker.`).join(' ')}`;

  return {
    parcel_id: site.id,
    site_id: site.id,
    vertical,
    overall_verdict: verdict,
    overall_score: avgScore,
    dimensions,
    summary,
    recommendations: recommendations.filter(Boolean),
    analyzed_at: new Date().toISOString(),
  };
}

async function analyzeZoning(site: FeasibilitySite, vertical: string): Promise<FeasibilityDimension> {
  const { data: zones } = await getSupabase()
    .from('zoning_districts')
    .select('zone_code, zone_name, zone_category, permitted_uses, conditional_uses')
    .eq('state', site.state)
    .limit(5);

  const zoning = site.zoning || zones?.[0]?.zone_code || 'Unknown';
  const z = zoning.toLowerCase();

  const zoningCompatibility: Record<string, string[]> = {
    data_center: ['industrial', 'commercial', 'mixed_use'],
    solar: ['agricultural', 'industrial', 'special'],
    wind: ['agricultural', 'industrial'],
    ev_charging: ['commercial', 'mixed_use', 'industrial'],
    industrial: ['industrial'],
    residential: ['residential', 'mixed_use'],
    mixed_use: ['mixed_use', 'commercial'],
  };

  const required = zoningCompatibility[vertical] || ['industrial', 'commercial'];
  const category = categorizeZoningCode(z);
  const isCompatible = required.includes(category);

  if (isCompatible) {
    return { name: 'Zoning', status: 'pass', score: 85, details: `Zoning ${zoning} is compatible with ${vertical.replace('_', ' ')} use.` };
  }

  const zone = zones?.find((zd) => zd.conditional_uses?.some((u: string) => u.toLowerCase().includes(vertical.replace('_', ' '))));
  if (zone) {
    return { name: 'Zoning', status: 'conditional', score: 55, details: `Zoning ${zoning} may allow ${vertical.replace('_', ' ')} as conditional use. Special use permit likely required.` };
  }

  return { name: 'Zoning', status: 'fail', score: 20, details: `Zoning ${zoning} (${category}) is incompatible with ${vertical.replace('_', ' ')}. Rezoning or variance required.` };
}

async function analyzeEnvironmental(site: FeasibilitySite): Promise<FeasibilityDimension> {
  const { data: envLayers } = await getSupabase()
    .from('environmental_layers')
    .select('layer_type, severity, designation')
    .eq('state', site.state)
    .limit(10);

  if (!envLayers || envLayers.length === 0) {
    return { name: 'Environmental', status: 'pass', score: 80, details: 'No known environmental constraints identified.' };
  }

  const highSeverity = envLayers.filter((e) => e.severity === 'high');
  if (highSeverity.length > 0) {
    const types = highSeverity.map((e) => e.layer_type).join(', ');
    return { name: 'Environmental', status: 'fail', score: 15, details: `High-severity environmental constraints: ${types}. Development significantly restricted.` };
  }

  const moderate = envLayers.filter((e) => e.severity === 'moderate');
  if (moderate.length > 0) {
    return { name: 'Environmental', status: 'conditional', score: 55, details: 'Moderate environmental constraints found. Mitigation measures may be required.' };
  }

  return { name: 'Environmental', status: 'pass', score: 80, details: 'Environmental constraints are minimal.' };
}

async function analyzeGridAccess(site: FeasibilitySite, vertical: string): Promise<FeasibilityDimension> {
  const distance = site.distance_to_substation_mi;
  let availableMw: number | null = null;

  if (site.nearest_substation_id) {
    const { data: sub } = await getSupabase()
      .from('substations')
      .select('available_mw')
      .eq('id', site.nearest_substation_id)
      .single();
    availableMw = sub?.available_mw || null;
  }

  const maxDistance: Record<string, number> = {
    data_center: 10, solar: 20, wind: 25, ev_charging: 5, industrial: 15, residential: 20, mixed_use: 10,
  };

  const threshold = maxDistance[vertical] || 15;

  if (distance !== null && distance !== undefined) {
    if (distance <= threshold && availableMw && availableMw > 50) {
      return { name: 'Grid Access', status: 'pass', score: 85, details: `Substation ${distance.toFixed(1)} mi away with ${availableMw}MW available capacity.` };
    }
    if (distance <= threshold * 2) {
      return { name: 'Grid Access', status: 'conditional', score: 50, details: `Nearest substation is ${distance.toFixed(1)} mi away. Grid interconnection study recommended.` };
    }
    return { name: 'Grid Access', status: 'fail', score: 20, details: `Nearest substation is ${distance.toFixed(1)} mi away, exceeding ${threshold} mi threshold for ${vertical.replace('_', ' ')}.` };
  }

  return { name: 'Grid Access', status: 'conditional', score: 45, details: 'Grid access data unavailable. Interconnection study required.' };
}

async function analyzeInfrastructure(site: FeasibilitySite, vertical: string): Promise<FeasibilityDimension> {
  const { data: infra } = await getSupabase()
    .from('market_intelligence')
    .select('metric, value')
    .eq('state', site.state)
    .in('metric', ['road_density', 'fiber_density', 'transmission_lines'])
    .limit(5);

  const hasRoads = infra?.some((i) => i.metric === 'road_density' && (i.value || 0) > 5);
  const hasFiber = infra?.some((i) => i.metric === 'fiber_density' && (i.value || 0) > 0);

  if (vertical === 'data_center' && !hasFiber) {
    return { name: 'Infrastructure', status: 'conditional', score: 45, details: 'Fiber connectivity data not confirmed. Dark fiber availability study recommended.' };
  }

  if (vertical === 'ev_charging' && !hasRoads) {
    return { name: 'Infrastructure', status: 'conditional', score: 50, details: 'Road infrastructure data limited. Traffic study recommended.' };
  }

  const score = 60 + (hasRoads ? 15 : 0) + (hasFiber ? 15 : 0);
  return { name: 'Infrastructure', status: score >= 70 ? 'pass' : 'conditional', score, details: 'Basic infrastructure present. Detailed utility survey recommended.' };
}

function analyzeLand(site: FeasibilitySite, vertical: string): FeasibilityDimension {
  const minAcreage: Record<string, number> = {
    data_center: 20, solar: 40, wind: 100, ev_charging: 0.5, industrial: 10, residential: 5, mixed_use: 2,
  };

  const required = minAcreage[vertical] || 10;
  const acreage = site.acreage || 0;

  if (acreage >= required * 1.5) {
    return { name: 'Land Suitability', status: 'pass', score: 90, details: `${acreage} acres exceeds minimum ${required} acre requirement for ${vertical.replace('_', ' ')}.` };
  }
  if (acreage >= required) {
    return { name: 'Land Suitability', status: 'pass', score: 70, details: `${acreage} acres meets minimum ${required} acre requirement.` };
  }
  if (acreage >= required * 0.5) {
    return { name: 'Land Suitability', status: 'conditional', score: 40, details: `${acreage} acres is below the ${required} acre minimum. Reduced capacity or phased development may work.` };
  }
  return { name: 'Land Suitability', status: 'fail', score: 10, details: `${acreage} acres is insufficient for ${vertical.replace('_', ' ')} (minimum ${required} acres).` };
}

function categorizeZoningCode(code: string): string {
  if (/industrial|m-|i-|mfg/.test(code)) return 'industrial';
  if (/commercial|c-|b-|bus/.test(code)) return 'commercial';
  if (/residential|r-|sf|mf/.test(code)) return 'residential';
  if (/agricultural|ag|ru/.test(code)) return 'agricultural';
  if (/mixed|mu|mx|pud|pd/.test(code)) return 'mixed_use';
  return 'other';
}
