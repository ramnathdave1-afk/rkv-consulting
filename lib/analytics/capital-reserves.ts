/**
 * Capital Reserve Modeling
 * Projects maintenance costs based on property age and work order history.
 * Calculates annual reserve contributions per component.
 */

import { createAdminClient } from '@/lib/supabase/admin';

// Standard useful life for building components (years)
const COMPONENT_USEFUL_LIFE: Record<string, number> = {
  roof: 25,
  hvac: 15,
  water_heater: 10,
  appliances: 12,
  flooring: 10,
  paint_exterior: 7,
  paint_interior: 5,
  parking_lot: 20,
  plumbing: 30,
  electrical: 30,
  windows: 25,
  elevator: 25,
  fire_system: 20,
  pool: 15,
  landscaping: 5,
  siding: 20,
  foundation: 50,
  gutters: 20,
};

// Estimated replacement cost per unit for each component
const REPLACEMENT_COST_PER_UNIT: Record<string, number> = {
  roof: 8000,
  hvac: 5000,
  water_heater: 1500,
  appliances: 3000,
  flooring: 2500,
  paint_exterior: 1500,
  paint_interior: 800,
  parking_lot: 2000,
  plumbing: 4000,
  electrical: 3500,
  windows: 3000,
  elevator: 50000,
  fire_system: 2000,
  pool: 25000,
  landscaping: 500,
  siding: 4000,
  foundation: 15000,
  gutters: 800,
};

export interface ReserveProjection {
  component: string;
  useful_life_years: number;
  replacement_cost: number;
  current_age: number;
  remaining_life: number;
  annual_contribution: number;
  urgency: 'immediate' | 'upcoming' | 'planned' | 'long_term';
}

export async function projectCapitalReserves(
  orgId: string,
  propertyId: string
): Promise<{ projections: ReserveProjection[]; total_annual_reserve: number; total_replacement_cost: number }> {
  const supabase = createAdminClient();

  const { data: property } = await supabase
    .from('properties')
    .select('year_built, unit_count')
    .eq('id', propertyId)
    .eq('org_id', orgId)
    .single();

  if (!property) return { projections: [], total_annual_reserve: 0, total_replacement_cost: 0 };

  const currentYear = new Date().getFullYear();
  const buildingAge = property.year_built ? currentYear - property.year_built : 20;
  const unitCount = property.unit_count || 1;

  // Check existing reserve records
  const { data: existingReserves } = await supabase
    .from('capital_reserves')
    .select('*')
    .eq('org_id', orgId)
    .eq('property_id', propertyId);

  // Generate projections for each component
  const projections: ReserveProjection[] = [];

  for (const [component, usefulLife] of Object.entries(COMPONENT_USEFUL_LIFE)) {
    const existing = existingReserves?.find((r) => r.component === component);

    const replacementCost = existing
      ? Number(existing.replacement_cost)
      : (REPLACEMENT_COST_PER_UNIT[component] || 2000) * unitCount;

    const installedYear = existing?.installed_year || (property.year_built || currentYear - 20);
    const currentAge = currentYear - installedYear;
    const cycleAge = currentAge % usefulLife;
    const remainingLife = Math.max(0, usefulLife - cycleAge);
    const annualContribution = remainingLife > 0 ? replacementCost / remainingLife : replacementCost;

    const urgency: ReserveProjection['urgency'] =
      remainingLife <= 0 ? 'immediate' :
      remainingLife <= 2 ? 'upcoming' :
      remainingLife <= 5 ? 'planned' : 'long_term';

    projections.push({
      component,
      useful_life_years: usefulLife,
      replacement_cost: replacementCost,
      current_age: cycleAge,
      remaining_life: remainingLife,
      annual_contribution: Math.round(annualContribution),
      urgency,
    });
  }

  projections.sort((a, b) => a.remaining_life - b.remaining_life);

  return {
    projections,
    total_annual_reserve: projections.reduce((s, p) => s + p.annual_contribution, 0),
    total_replacement_cost: projections.reduce((s, p) => s + p.replacement_cost, 0),
  };
}
