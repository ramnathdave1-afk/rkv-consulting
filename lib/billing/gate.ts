/**
 * Server-side feature gate helpers. Use these inside API route handlers to
 * enforce plan limits before executing a write or returning data.
 *
 * Example:
 *   const gate = await requireFeature(orgId, 'voice_ai');
 *   if (!gate.allowed) return gate.response;
 */

import { NextResponse } from 'next/server';
import { PLANS, type FeatureKey, type PlanLimits, type PlanTier } from './plans';
import { createAdminClient } from '@/lib/supabase/admin';

export type GateResult =
  | { allowed: true }
  | { allowed: false; response: Response };

/**
 * Resolves the active plan for an organization.
 *
 * If the org is on a trial that has expired, the plan returned is a locked-out
 * variant of the trial plan with `max_units: 0` and `name: 'Trial Expired'`,
 * so callers will fail every limit check until the org upgrades.
 */
export async function getOrgPlan(orgId: string): Promise<PlanLimits> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('organizations')
    .select('plan_tier, trial_ends_at')
    .eq('id', orgId)
    .single();

  const tier = ((data?.plan_tier as PlanTier | undefined) ?? 'trial') as PlanTier;
  const plan = PLANS[tier] ?? PLANS.trial;

  if (
    tier === 'trial' &&
    data?.trial_ends_at &&
    new Date(data.trial_ends_at as string) < new Date()
  ) {
    return { ...plan, max_units: 0, name: 'Trial Expired' };
  }

  return plan;
}

function gateFailure(payload: Record<string, unknown>, status = 403): GateResult {
  return {
    allowed: false,
    response: NextResponse.json(payload, { status }),
  };
}

/** Require a feature flag. Returns 403 with upgrade info if not on plan. */
export async function requireFeature(
  orgId: string,
  feature: FeatureKey
): Promise<GateResult> {
  const plan = await getOrgPlan(orgId);
  if (plan.features[feature]) return { allowed: true };
  return gateFailure({
    error: 'Feature not available on your plan',
    feature,
    current_plan: plan.tier,
    upgrade_url: '/settings/billing/upgrade',
  });
}

async function countOrgRows(orgId: string, table: string): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);
  return count ?? 0;
}

/** Require there's room under the unit count limit. */
export async function requireUnitLimit(orgId: string): Promise<GateResult> {
  const plan = await getOrgPlan(orgId);
  if (plan.max_units === 0 && plan.name !== 'Trial Expired') return { allowed: true };

  const count = await countOrgRows(orgId, 'units');
  if (plan.max_units > 0 && count < plan.max_units) return { allowed: true };

  return gateFailure({
    error: `Unit limit reached. Your ${plan.name} plan allows ${plan.max_units} units.`,
    current_count: count,
    limit: plan.max_units,
    current_plan: plan.tier,
    upgrade_url: '/settings/billing/upgrade',
  });
}

/** Require there's room under the user count limit. */
export async function requireUserLimit(orgId: string): Promise<GateResult> {
  const plan = await getOrgPlan(orgId);
  if (plan.max_users === 0 && plan.name !== 'Trial Expired') return { allowed: true };

  const count = await countOrgRows(orgId, 'profiles');
  if (plan.max_users > 0 && count < plan.max_users) return { allowed: true };

  return gateFailure({
    error: `User limit reached. Your ${plan.name} plan allows ${plan.max_users} users.`,
    current_count: count,
    limit: plan.max_users,
    current_plan: plan.tier,
    upgrade_url: '/settings/billing/upgrade',
  });
}

/** Require there's room under the location count limit. */
export async function requireLocationLimit(orgId: string): Promise<GateResult> {
  const plan = await getOrgPlan(orgId);
  if (plan.max_locations === 0 && plan.name !== 'Trial Expired') return { allowed: true };

  const count = await countOrgRows(orgId, 'locations');
  if (plan.max_locations > 0 && count < plan.max_locations) return { allowed: true };

  return gateFailure({
    error: `Location limit reached. Your ${plan.name} plan allows ${plan.max_locations} locations.`,
    current_count: count,
    limit: plan.max_locations,
    current_plan: plan.tier,
    upgrade_url: '/settings/billing/upgrade',
  });
}

/** Require there's room under the integration count limit. */
export async function requireIntegrationLimit(orgId: string): Promise<GateResult> {
  const plan = await getOrgPlan(orgId);
  if (plan.max_integrations === 0 && plan.name !== 'Trial Expired') return { allowed: true };

  const count = await countOrgRows(orgId, 'integrations');
  if (plan.max_integrations > 0 && count < plan.max_integrations) return { allowed: true };

  return gateFailure({
    error: `Integration limit reached. Your ${plan.name} plan allows ${plan.max_integrations} integrations.`,
    current_count: count,
    limit: plan.max_integrations,
    current_plan: plan.tier,
    upgrade_url: '/settings/billing/upgrade',
  });
}

/** Aggregate usage snapshot for the org. Used by /api/billing/plan. */
export async function getOrgUsage(orgId: string): Promise<{
  units: number;
  users: number;
  locations: number;
  integrations: number;
}> {
  const [units, users, locations, integrations] = await Promise.all([
    countOrgRows(orgId, 'units').catch(() => 0),
    countOrgRows(orgId, 'profiles').catch(() => 0),
    countOrgRows(orgId, 'locations').catch(() => 0),
    countOrgRows(orgId, 'integrations').catch(() => 0),
  ]);
  return { units, users, locations, integrations };
}
