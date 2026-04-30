'use client';

import { useEffect, useState, useCallback } from 'react';
import type { FeatureKey, PlanTier } from './plans';

export interface PlanResponse {
  tier: PlanTier;
  name: string;
  price_monthly: number;
  features: Record<FeatureKey, boolean>;
  limits: {
    max_units: number;
    max_users: number;
    max_locations: number;
    max_integrations: number;
  };
  usage: {
    units: number;
    users: number;
    locations: number;
    integrations: number;
  };
}

/**
 * Client hook — fetches `/api/billing/plan` and returns the active plan,
 * feature flags, and live usage. SWR is not installed here, so this is a
 * lightweight effect-based fetcher with manual `refresh()` support.
 */
export function usePlan() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/plan');
      if (!res.ok) throw new Error(`Failed to load plan: ${res.status}`);
      const data = (await res.json()) as PlanResponse;
      setPlan(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plan, isLoading, error, refresh };
}

/** Convenience: check whether a given feature is available on the active plan. */
export function useFeature(feature: FeatureKey): boolean {
  const { plan } = usePlan();
  return Boolean(plan?.features?.[feature]);
}
