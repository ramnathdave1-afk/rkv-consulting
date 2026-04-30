import { NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { getOrgPlan, getOrgUsage } from '@/lib/billing/gate';

/**
 * Returns the active plan, feature flags, hard limits, and current usage for
 * the requesting org. Consumed by the `usePlan` client hook for UI gating.
 */
export async function GET() {
  const { user, orgId } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [plan, usage] = await Promise.all([
    getOrgPlan(orgId),
    getOrgUsage(orgId),
  ]);

  return NextResponse.json({
    tier: plan.tier,
    name: plan.name,
    price_monthly: plan.price_monthly,
    features: plan.features,
    limits: {
      max_units: plan.max_units,
      max_users: plan.max_users,
      max_locations: plan.max_locations,
      max_integrations: plan.max_integrations,
    },
    usage,
  });
}
