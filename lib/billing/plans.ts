/**
 * Billing plan tiers — single source of truth for feature gating, pricing,
 * and hard limits. All gate helpers, the upgrade page, and the public pricing
 * page should read from this config.
 */

export type PlanTier = 'trial' | 'starter' | 'growth' | 'enterprise';

export type FeatureKey =
  | 'ai_leasing_agent'
  | 'ai_maintenance_triage'
  | 'voice_ai'
  | 'fair_housing_filter'
  | 'csv_import'
  | 'pm_integrations'
  | 'multi_location'
  | 'white_label'
  | 'custom_domain'
  | 'sso_saml'
  | 'audit_log'
  | 'sla_tracking'
  | 'acquisitions_module'
  | 'deal_scoring_ai'
  | 'api_access'
  | 'webhooks'
  | 'priority_support'
  | 'dedicated_csm';

export interface PlanLimits {
  tier: PlanTier;
  name: string;
  price_monthly: number;

  // Hard limits — 0 means unlimited
  max_units: number;
  max_users: number;
  max_locations: number;
  max_integrations: number;

  features: Record<FeatureKey, boolean>;
}

export const PLANS: Record<PlanTier, PlanLimits> = {
  trial: {
    tier: 'trial',
    name: 'Free Trial',
    price_monthly: 0,
    max_units: 50,
    max_users: 3,
    max_locations: 1,
    max_integrations: 1,
    features: {
      ai_leasing_agent: true,
      ai_maintenance_triage: true,
      voice_ai: false,
      fair_housing_filter: true,
      csv_import: true,
      pm_integrations: true,
      multi_location: false,
      white_label: false,
      custom_domain: false,
      sso_saml: false,
      audit_log: false,
      sla_tracking: false,
      acquisitions_module: false,
      deal_scoring_ai: false,
      api_access: false,
      webhooks: false,
      priority_support: false,
      dedicated_csm: false,
    },
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    price_monthly: 99,
    max_units: 250,
    max_users: 5,
    max_locations: 1,
    max_integrations: 2,
    features: {
      ai_leasing_agent: true,
      ai_maintenance_triage: true,
      voice_ai: false,
      fair_housing_filter: true,
      csv_import: true,
      pm_integrations: true,
      multi_location: false,
      white_label: false,
      custom_domain: false,
      sso_saml: false,
      audit_log: true,
      sla_tracking: false,
      acquisitions_module: false,
      deal_scoring_ai: false,
      api_access: false,
      webhooks: false,
      priority_support: false,
      dedicated_csm: false,
    },
  },
  growth: {
    tier: 'growth',
    name: 'Growth',
    price_monthly: 299,
    max_units: 1000,
    max_users: 20,
    max_locations: 5,
    max_integrations: 5,
    features: {
      ai_leasing_agent: true,
      ai_maintenance_triage: true,
      voice_ai: true,
      fair_housing_filter: true,
      csv_import: true,
      pm_integrations: true,
      multi_location: true,
      white_label: true,
      custom_domain: false,
      sso_saml: false,
      audit_log: true,
      sla_tracking: true,
      acquisitions_module: true,
      deal_scoring_ai: true,
      api_access: true,
      webhooks: true,
      priority_support: true,
      dedicated_csm: false,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    price_monthly: 999,
    max_units: 0,
    max_users: 0,
    max_locations: 0,
    max_integrations: 0,
    features: {
      ai_leasing_agent: true,
      ai_maintenance_triage: true,
      voice_ai: true,
      fair_housing_filter: true,
      csv_import: true,
      pm_integrations: true,
      multi_location: true,
      white_label: true,
      custom_domain: true,
      sso_saml: true,
      audit_log: true,
      sla_tracking: true,
      acquisitions_module: true,
      deal_scoring_ai: true,
      api_access: true,
      webhooks: true,
      priority_support: true,
      dedicated_csm: true,
    },
  },
};

export const PLAN_TIER_ORDER: PlanTier[] = ['trial', 'starter', 'growth', 'enterprise'];

/** Friendly labels for each feature, for use in UI prompts and comparison tables. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  ai_leasing_agent: 'AI Leasing Agent',
  ai_maintenance_triage: 'AI Maintenance Triage',
  voice_ai: 'Voice AI',
  fair_housing_filter: 'Fair Housing Filter',
  csv_import: 'CSV Import',
  pm_integrations: 'PM Integrations (AppFolio, Buildium, etc.)',
  multi_location: 'Multi-Location Support',
  white_label: 'White Label Branding',
  custom_domain: 'Custom Domain',
  sso_saml: 'SSO / SAML',
  audit_log: 'Audit Log',
  sla_tracking: 'SLA Tracking',
  acquisitions_module: 'Acquisitions CRM',
  deal_scoring_ai: 'AI Deal Scoring',
  api_access: 'API Access',
  webhooks: 'Webhooks',
  priority_support: 'Priority Support',
  dedicated_csm: 'Dedicated Customer Success Manager',
};

/** Map a Stripe price ID (from env) to a plan tier. */
export function mapStripeProductToTier(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'trial';
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return 'growth';
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return 'enterprise';
  // Backwards-compat with legacy env var names if a customer is on an older plan
  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  ) {
    return 'growth';
  }
  if (
    priceId === process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID
  ) {
    return 'enterprise';
  }
  return 'trial';
}
