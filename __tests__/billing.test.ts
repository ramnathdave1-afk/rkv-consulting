import { describe, it, expect } from 'vitest';
import { PLAN_DETAILS, getPriceId } from '@/lib/billing/usage';

describe('Billing - Plan Details', () => {
  it('has all three plan tiers', () => {
    expect(PLAN_DETAILS.explorer).toBeDefined();
    expect(PLAN_DETAILS.pro).toBeDefined();
    expect(PLAN_DETAILS.enterprise).toBeDefined();
  });

  it('explorer plan is free', () => {
    expect(PLAN_DETAILS.explorer.price).toBe(0);
    expect(PLAN_DETAILS.explorer.annualPrice).toBe(0);
  });

  it('pro plan has correct pricing', () => {
    expect(PLAN_DETAILS.pro.price).toBe(199);
    expect(PLAN_DETAILS.pro.annualPrice).toBe(159);
  });

  it('enterprise plan has custom pricing', () => {
    expect(PLAN_DETAILS.enterprise.price).toBe(-1);
  });
});

describe('Billing - Price IDs', () => {
  it('returns null for invalid plan', () => {
    expect(getPriceId('nonexistent', 'monthly')).toBeNull();
  });

  it('returns null for explorer plan (no stripe price)', () => {
    expect(getPriceId('explorer', 'monthly')).toBeNull();
  });
});
