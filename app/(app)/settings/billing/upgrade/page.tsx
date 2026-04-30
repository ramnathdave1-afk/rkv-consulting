'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowLeft, Loader2 } from 'lucide-react';
import { PLANS, PLAN_TIER_ORDER, FEATURE_LABELS, type PlanTier, type FeatureKey } from '@/lib/billing/plans';
import type { PlanResponse } from '@/lib/billing/use-plan';

const COMPARISON_FEATURES: FeatureKey[] = [
  'ai_leasing_agent',
  'ai_maintenance_triage',
  'voice_ai',
  'fair_housing_filter',
  'csv_import',
  'pm_integrations',
  'multi_location',
  'white_label',
  'custom_domain',
  'sso_saml',
  'audit_log',
  'sla_tracking',
  'acquisitions_module',
  'deal_scoring_ai',
  'api_access',
  'webhooks',
  'priority_support',
  'dedicated_csm',
];

function formatLimit(value: number): string {
  return value === 0 ? 'Unlimited' : value.toLocaleString();
}

function tierIndex(t: PlanTier): number {
  return PLAN_TIER_ORDER.indexOf(t);
}

export default function UpgradePage() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionTier, setActionTier] = useState<PlanTier | null>(null);

  useEffect(() => {
    fetch('/api/billing/plan')
      .then((r) => r.json())
      .then((data) => setPlan(data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout(tier: PlanTier) {
    setActionTier(tier);
    try {
      const res = await fetch(`/api/stripe/checkout?plan=${tier}`, { method: 'POST' });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        alert(data.error);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setActionTier(null);
    }
  }

  async function openPortal() {
    setActionTier('enterprise');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data?.url) window.location.href = data.url;
    } finally {
      setActionTier(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const currentTier = (plan?.tier ?? 'trial') as PlanTier;
  const currentIdx = tierIndex(currentTier);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/settings/billing"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Billing
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Upgrade your plan</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          You&rsquo;re currently on the <strong>{plan?.name ?? 'Free Trial'}</strong> plan.
        </p>
      </header>

      {plan && (
        <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <UsageStat label="Units" used={plan.usage.units} limit={plan.limits.max_units} />
          <UsageStat label="Users" used={plan.usage.users} limit={plan.limits.max_users} />
          <UsageStat label="Locations" used={plan.usage.locations} limit={plan.limits.max_locations} />
          <UsageStat label="Integrations" used={plan.usage.integrations} limit={plan.limits.max_integrations} />
        </section>
      )}

      <section className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_TIER_ORDER.map((tier) => {
          const p = PLANS[tier];
          const isCurrent = tier === currentTier;
          const isUpgrade = tierIndex(tier) > currentIdx;
          const isDowngrade = tierIndex(tier) < currentIdx && currentIdx > 0;
          return (
            <div
              key={tier}
              className={`rounded-xl border p-6 ${
                isCurrent
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-3">
                <span className="text-3xl font-semibold">${p.price_monthly}</span>
                <span className="text-sm text-zinc-500">/mo</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm">
                <li>{formatLimit(p.max_units)} units</li>
                <li>{formatLimit(p.max_users)} users</li>
                <li>{formatLimit(p.max_locations)} locations</li>
                <li>{formatLimit(p.max_integrations)} integrations</li>
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    Current plan
                  </button>
                ) : isUpgrade ? (
                  <button
                    onClick={() => startCheckout(tier)}
                    disabled={actionTier !== null}
                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {actionTier === tier ? 'Redirecting…' : `Upgrade to ${p.name}`}
                  </button>
                ) : isDowngrade ? (
                  <button
                    onClick={openPortal}
                    disabled={actionTier !== null}
                    className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    Downgrade
                  </button>
                ) : (
                  <button
                    onClick={openPortal}
                    className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Feature comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Feature</th>
                {PLAN_TIER_ORDER.map((t) => (
                  <th key={t} className="px-4 py-3 text-center font-medium">
                    {PLANS[t].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((f, i) => (
                <tr
                  key={f}
                  className={i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-zinc-50/40 dark:bg-zinc-900/20'}
                >
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{FEATURE_LABELS[f]}</td>
                  {PLAN_TIER_ORDER.map((t) => (
                    <td key={t} className="px-4 py-3 text-center">
                      {PLANS[t].features[f] ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-600" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/40 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div>
            <h3 className="font-medium">Need to cancel?</h3>
            <p className="text-sm text-zinc-500">
              Manage payment methods, invoices, or cancel through the Stripe customer portal.
            </p>
          </div>
          <button
            onClick={openPortal}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Open billing portal
          </button>
        </div>
      </section>
    </div>
  );
}

function UsageStat({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const tone = limit === 0
    ? 'bg-zinc-300'
    : pct >= 90
      ? 'bg-rose-500'
      : pct >= 75
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">
        {used.toLocaleString()}
        <span className="text-sm font-normal text-zinc-500"> / {formatLimit(limit)}</span>
      </div>
      {limit > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
