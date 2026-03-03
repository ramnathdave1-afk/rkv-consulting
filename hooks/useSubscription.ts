'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanName, type FeatureKey } from '@/lib/stripe/plans'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SubscriptionRow {
  id: string
  user_id: string
  stripe_subscription_id: string
  stripe_price_id: string | null
  plan_name: PlanName
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused'
  current_period_start: string
  current_period_end: string
  trial_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

interface UseSubscriptionReturn {
  subscription: SubscriptionRow | null
  planName: PlanName
  plan: (typeof PLANS)[PlanName]
  isLoading: boolean
  isActive: boolean
  hasFeature: (featureKey: FeatureKey) => boolean
  getLimit: (featureKey: FeatureKey) => number
  isAtLimit: (featureKey: FeatureKey, currentCount: number) => boolean
  daysUntilRenewal: number
  trialDaysRemaining: number | null
}

/* ------------------------------------------------------------------ */
/*  Paid-only feature keys (false on basic plan)                       */
/* ------------------------------------------------------------------ */

const PAID_FEATURES: Set<FeatureKey> = new Set(
  (Object.keys(PLANS.basic.features) as FeatureKey[]).filter(
    (key) => PLANS.basic.features[key] === false || PLANS.basic.features[key] === 0
  )
)

/* ------------------------------------------------------------------ */
/*  Helper: days between now and a date string                         */
/* ------------------------------------------------------------------ */

function daysFromNow(dateString: string | null | undefined): number {
  if (!dateString) return 0
  const target = new Date(dateString).getTime()
  const now = Date.now()
  const diff = target - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSubscription(): UseSubscriptionReturn {
  const supabase = createClient()

  const { data: subscription = null, isLoading } = useQuery<SubscriptionRow | null>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return null

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null
      return data as SubscriptionRow
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  })

  /* ---- Derived values ---- */

  const planName: PlanName = subscription?.plan_name ?? 'basic'
  const plan = PLANS[planName]
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

  /* ---- Feature access ---- */

  function hasFeature(featureKey: FeatureKey): boolean {
    if (isActive) {
      const value = plan.features[featureKey]
      // Boolean features: true = enabled
      // Numeric features: > 0 = enabled
      return typeof value === 'boolean' ? value : value > 0
    }
    // Fallback to basic plan, with paid features disabled
    if (PAID_FEATURES.has(featureKey)) return false
    const basicValue = PLANS.basic.features[featureKey]
    return typeof basicValue === 'boolean' ? basicValue : basicValue > 0
  }

  function getLimit(featureKey: FeatureKey): number {
    if (isActive) {
      const value = plan.features[featureKey]
      return typeof value === 'number' ? value : value ? Infinity : 0
    }
    // Not active: paid features return 0, basic features return their limit
    if (PAID_FEATURES.has(featureKey)) return 0
    const basicValue = PLANS.basic.features[featureKey]
    return typeof basicValue === 'number' ? basicValue : basicValue ? Infinity : 0
  }

  function isAtLimit(featureKey: FeatureKey, currentCount: number): boolean {
    const limit = getLimit(featureKey)
    if (limit === Infinity) return false
    return currentCount >= limit
  }

  /* ---- Renewal / trial ---- */

  const daysUntilRenewal = daysFromNow(subscription?.current_period_end)

  const trialDaysRemaining =
    subscription?.status === 'trialing' && subscription?.trial_end
      ? daysFromNow(subscription.trial_end)
      : null

  return {
    subscription,
    planName,
    plan,
    isLoading,
    isActive,
    hasFeature,
    getLimit,
    isAtLimit,
    daysUntilRenewal,
    trialDaysRemaining,
  }
}

export default useSubscription
