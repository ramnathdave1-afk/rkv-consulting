'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Loader2, Mail } from 'lucide-react';
import { PLANS, PLAN_TIER_ORDER, type PlanTier } from '@/lib/billing/plans';
import type { PlanResponse } from '@/lib/billing/use-plan';

const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK || 'https://cal.com/rkv-consulting/demo';
const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL || 'sales@rkv-consulting.com';

function formatLimit(value: number): string {
  return value === 0 ? 'Unlimited' : value.toLocaleString();
}

export default function UpgradePage() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing/plan')
      .then((r) => r.json())
      .then((data) => setPlan(data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const currentTier = (plan?.tier ?? 'trial') as PlanTier;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/settings/billing"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Billing
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Change your plan</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          You&rsquo;re currently on the <strong>{plan?.name ?? 'Free Trial'}</strong> plan. Plan
          changes are handled by your account manager &mdash; we&rsquo;ll tailor pricing and limits
          to your portfolio.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold">Contact your account manager to upgrade</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Tell us about new units, locations, or features you need. We&rsquo;ll move your org to
          the right tier and update billing on the next invoice cycle.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={CAL_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Calendar className="h-4 w-4" />
            Book a call
          </a>
          <a
            href={`mailto:${SALES_EMAIL}?subject=Plan%20change%20request`}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Mail className="h-4 w-4" />
            Email {SALES_EMAIL}
          </a>
        </div>
      </section>

      {plan && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">Current usage</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <UsageStat label="Units" used={plan.usage.units} limit={plan.limits.max_units} />
            <UsageStat label="Users" used={plan.usage.users} limit={plan.limits.max_users} />
            <UsageStat label="Locations" used={plan.usage.locations} limit={plan.limits.max_locations} />
            <UsageStat label="Integrations" used={plan.usage.integrations} limit={plan.limits.max_integrations} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">Available plans</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Units</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Users</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Locations</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_TIER_ORDER.map((tier) => {
                const p = PLANS[tier];
                const isCurrent = tier === currentTier;
                return (
                  <tr
                    key={tier}
                    className={
                      isCurrent
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'bg-white dark:bg-transparent'
                    }
                  >
                    <td className="px-4 py-3 font-medium">
                      {p.name}
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatLimit(p.max_units)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatLimit(p.max_users)}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatLimit(p.max_locations)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Pricing is set during onboarding and scales with units managed. Reach out for a quote.
        </p>
      </section>
    </div>
  );
}

function UsageStat({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const tone =
    limit === 0
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
