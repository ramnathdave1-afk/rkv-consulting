/**
 * Billing & Usage — Server-side utilities for checking and tracking plan usage.
 */

import { createClient } from '@/lib/supabase/server';

export type PlanTier = 'explorer' | 'pro' | 'enterprise';
export type Feature = 'sites' | 'api_calls' | 'feasibility' | 'chat_messages' | 'team_members' | 'pdf_reports' | 'properties' | 'units' | 'work_orders' | 'conversations' | 'showings';

export interface UsageCheck {
  allowed: boolean;
  used: number;
  limit: number;
  plan: PlanTier;
}

export interface SubscriptionInfo {
  plan: PlanTier;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

const PLAN_PRICES: Record<string, { monthly: string; annual: string }> = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || '',
  },
};

export function getPriceId(plan: string, interval: 'monthly' | 'annual'): string | null {
  return PLAN_PRICES[plan]?.[interval] || null;
}

/** Check if an org can use a feature based on their plan limits. */
export async function checkLimit(orgId: string, feature: Feature): Promise<UsageCheck> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('check_usage_limit', {
    p_org_id: orgId,
    p_feature: feature,
  });

  if (error || !data) {
    // Default to explorer limits if DB call fails
    return { allowed: false, used: 0, limit: 0, plan: 'explorer' };
  }

  return data as UsageCheck;
}

/** Increment usage counter after a successful action. */
export async function incrementUsage(orgId: string, feature: Feature, amount = 1): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('increment_usage', {
    p_org_id: orgId,
    p_feature: feature,
    p_amount: amount,
  });
}

/** Get subscription info for an org. */
export async function getSubscription(orgId: string): Promise<SubscriptionInfo> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end')
    .eq('org_id', orgId)
    .in('status', ['active', 'trialing', 'past_due'])
    .single();

  if (!data) {
    return {
      plan: 'explorer',
      status: 'active',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };
  }

  return data as SubscriptionInfo;
}

/** Get all usage records for an org in the current period. */
export async function getUsage(orgId: string): Promise<Record<Feature, UsageCheck>> {
  const features: Feature[] = ['sites', 'api_calls', 'feasibility', 'chat_messages', 'team_members', 'pdf_reports', 'properties', 'units', 'work_orders', 'conversations'];
  const results = await Promise.all(features.map((f) => checkLimit(orgId, f)));
  return Object.fromEntries(features.map((f, i) => [f, results[i]])) as Record<Feature, UsageCheck>;
}

/** Plan display metadata. */
export const PLAN_DETAILS: Record<PlanTier, { name: string; price: number; annualPrice: number; description: string }> = {
  explorer: { name: 'Starter', price: 0, annualPrice: 0, description: 'For PM companies with 50–100 units' },
  pro: { name: 'Growth', price: 0, annualPrice: 0, description: 'For established operators with 100–250 units' },
  enterprise: { name: 'Pro', price: 0, annualPrice: 0, description: 'For investor-operators with 250–500 units' },
};
