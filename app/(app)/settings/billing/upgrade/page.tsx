'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Loader2, Mail, Check } from 'lucide-react';
import { PLANS, PLAN_TIER_ORDER, type PlanTier } from '@/lib/billing/plans';
import type { PlanResponse } from '@/lib/billing/use-plan';
import { cn } from '@/lib/utils';
import {
  SettingsShell,
  SettingsCard,
  SettingsCardHeader,
  SettingsCardBody,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
} from '@/components/settings/SettingsShell';

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
      <SettingsShell title="Change your plan" subtitle="Plan changes are handled by your account manager.">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </SettingsShell>
    );
  }

  const currentTier = (plan?.tier ?? 'trial') as PlanTier;

  return (
    <SettingsShell
      title="Change your plan"
      subtitle={`You're currently on the ${plan?.name ?? 'Free Trial'} plan. Plan changes are handled by your account manager.`}
      actions={
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-[#020617]"
        >
          <ArrowLeft size={14} /> Back to Billing
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Contact account manager card */}
        <SettingsCard>
          <SettingsCardBody className="p-6">
            <h2 className="font-display text-lg font-semibold text-[#020617]">
              Contact Sales to Upgrade
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Tell us about new units, locations, or features you need. We&rsquo;ll move your org to the
              right tier and update billing on the next invoice cycle.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <a href={CAL_LINK} target="_blank" rel="noreferrer" className={settingsPrimaryButtonClass}>
                <Calendar size={14} />
                Book a call
              </a>
              <a
                href={`mailto:${SALES_EMAIL}?subject=Plan%20change%20request`}
                className={settingsSecondaryButtonClass}
              >
                <Mail size={14} />
                Email {SALES_EMAIL}
              </a>
            </div>
          </SettingsCardBody>
        </SettingsCard>

        {/* Current usage */}
        {plan && (
          <SettingsCard>
            <SettingsCardHeader title="Current usage" description="Counts against your active plan limits." />
            <SettingsCardBody>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <UsageStat label="Units" used={plan.usage.units} limit={plan.limits.max_units} />
                <UsageStat label="Users" used={plan.usage.users} limit={plan.limits.max_users} />
                <UsageStat label="Locations" used={plan.usage.locations} limit={plan.limits.max_locations} />
                <UsageStat
                  label="Integrations"
                  used={plan.usage.integrations}
                  limit={plan.limits.max_integrations}
                />
              </div>
            </SettingsCardBody>
          </SettingsCard>
        )}

        {/* Plan tiers grid */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Available plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PLAN_TIER_ORDER.map((tier) => {
              const p = PLANS[tier];
              const isCurrent = tier === currentTier;
              return (
                <div
                  key={tier}
                  className={cn(
                    'bg-white border rounded-lg shadow-sm p-5 flex flex-col',
                    isCurrent ? 'border-[#0369A1] ring-1 ring-[#0369A1]/20' : 'border-slate-200',
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base font-semibold text-[#020617]">{p.name}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-[#0369A1] border border-sky-100">
                        Current
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm text-slate-600 flex-1">
                    <FeatureLine label={`${formatLimit(p.max_units)} units`} />
                    <FeatureLine label={`${formatLimit(p.max_users)} users`} />
                    <FeatureLine label={`${formatLimit(p.max_locations)} locations`} />
                    <FeatureLine label={`${formatLimit(p.max_integrations)} integrations`} />
                  </ul>
                  {!isCurrent && (
                    <a
                      href={`mailto:${SALES_EMAIL}?subject=Upgrade%20to%20${encodeURIComponent(p.name)}`}
                      className={cn(settingsSecondaryButtonClass, 'mt-4 w-full justify-center')}
                    >
                      Contact Sales
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Pricing is set during onboarding and scales with units managed. Reach out for a quote.
          </p>
        </div>
      </div>
    </SettingsShell>
  );
}

function FeatureLine({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check size={14} className="text-[#0369A1] mt-0.5 shrink-0" />
      <span>{label}</span>
    </li>
  );
}

function UsageStat({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const tone =
    limit === 0
      ? 'bg-slate-200'
      : pct >= 90
        ? 'bg-red-500'
        : pct >= 75
          ? 'bg-amber-500'
          : 'bg-[#0369A1]';
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-[#020617] tabular-nums">
        {used.toLocaleString()}
        <span className="text-sm font-normal text-slate-500"> / {formatLimit(limit)}</span>
      </div>
      {limit > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={cn('h-full', tone)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
