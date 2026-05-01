'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Shield,
  Zap,
  Building2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import {
  SettingsShell,
  SettingsCard,
  SettingsCardHeader,
  SettingsCardBody,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
} from '@/components/settings/SettingsShell';

interface UsageCheck {
  allowed: boolean;
  used: number;
  limit: number;
  plan: string;
}

interface BillingData {
  subscription: {
    plan: string;
    status: string;
    stripe_customer_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  };
  usage: Record<string, UsageCheck>;
  invoices?: Array<{
    id: string;
    number?: string;
    amount_paid?: number;
    currency?: string;
    status?: string;
    created?: number;
    invoice_pdf?: string | null;
  }>;
}

const featureLabels: Record<string, { label: string }> = {
  units: { label: 'Units' },
  users: { label: 'Users' },
  locations: { label: 'Locations' },
  integrations: { label: 'Integrations' },
  sites: { label: 'Sites' },
  api_calls: { label: 'API Calls' },
  feasibility: { label: 'Feasibility Analyses' },
  chat_messages: { label: 'AI Chat Messages' },
  team_members: { label: 'Team Members' },
  pdf_reports: { label: 'PDF Reports' },
};

const planConfig: Record<string, { name: string; icon: typeof Zap; price: string }> = {
  trial: { name: 'Trial', icon: Zap, price: 'Free' },
  explorer: { name: 'Explorer', icon: Zap, price: 'Free' },
  starter: { name: 'Starter', icon: Shield, price: 'Contact sales' },
  growth: { name: 'Growth', icon: Shield, price: 'Contact sales' },
  pro: { name: 'Pro', icon: Shield, price: '$199/mo' },
  enterprise: { name: 'Enterprise', icon: Building2, price: 'Custom' },
};

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit === -1 || limit === 0;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-[#020617]',
          )}
        >
          {isUnlimited ? (
            <span className="text-[#0369A1]">Unlimited</span>
          ) : (
            <>
              {used.toLocaleString()} <span className="text-slate-400">/ {limit.toLocaleString()}</span>
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-[#0369A1]',
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <SettingsShell title="Billing & Usage" subtitle="Manage your subscription and track usage">
          <div className="h-48 w-full rounded-lg bg-slate-100 animate-pulse" />
        </SettingsShell>
      }
    >
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    fetch('/api/billing')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setPortalLoading(false);
  };

  const plan = data?.subscription?.plan || 'trial';
  const config = planConfig[plan] || planConfig.trial;
  const PlanIcon = config.icon;

  if (loading) {
    return (
      <SettingsShell title="Billing & Usage" subtitle="Manage your subscription and track usage">
        <div className="h-48 w-full rounded-lg bg-slate-100 animate-pulse" />
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      title="Billing & Usage"
      subtitle="Manage your subscription and track usage"
      actions={
        <Link href="/settings/billing/upgrade" className={settingsSecondaryButtonClass}>
          <ArrowUpRight size={14} /> Talk to Sales
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Success/Cancel banners */}
        {success && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            <span className="font-medium">Subscription activated! Welcome to {config.name}.</span>
          </div>
        )}
        {canceled && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertTriangle size={16} />
            <span className="font-medium">Checkout was canceled. No changes were made.</span>
          </div>
        )}

        {/* Current Plan Card */}
        <SettingsCard>
          <SettingsCardBody className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-[#0369A1]">
                  <PlanIcon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-xl font-bold text-[#020617]">{config.name}</h2>
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#0369A1] border border-sky-100">
                      {data?.subscription?.status || 'active'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {config.price}
                    {data?.subscription?.current_period_end && (
                      <> · Renews {new Date(data.subscription.current_period_end).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {plan !== 'enterprise' && (
                  <Link href="/settings/billing/upgrade" className={settingsPrimaryButtonClass}>
                    <ArrowUpRight size={14} />
                    Upgrade
                  </Link>
                )}
                {data?.subscription?.stripe_customer_id && (
                  <button
                    type="button"
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className={settingsSecondaryButtonClass}
                  >
                    <ExternalLink size={14} />
                    {portalLoading ? 'Loading...' : 'Manage'}
                  </button>
                )}
              </div>
            </div>

            {data?.subscription?.cancel_at_period_end && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <span className="text-xs text-amber-700">
                  Your subscription will cancel at the end of the current period.
                </span>
              </div>
            )}
          </SettingsCardBody>
        </SettingsCard>

        {/* Usage Meters */}
        {data?.usage && Object.keys(data.usage).length > 0 && (
          <SettingsCard>
            <SettingsCardHeader title="Current Period Usage" description="Live counts for plan limits." />
            <SettingsCardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(data.usage).map(([feature, usage]) => {
                  const meta = featureLabels[feature] ?? { label: feature };
                  return (
                    <UsageBar
                      key={feature}
                      label={meta.label}
                      used={usage.used}
                      limit={usage.limit}
                    />
                  );
                })}
              </div>
            </SettingsCardBody>
          </SettingsCard>
        )}

        {/* Invoice history */}
        <SettingsCard>
          <SettingsCardHeader
            title="Invoice History"
            description="Recent invoices from Stripe."
            actions={
              data?.subscription?.stripe_customer_id ? (
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="text-sm text-[#0369A1] hover:underline inline-flex items-center gap-1"
                >
                  Open Stripe portal <ExternalLink size={12} />
                </button>
              ) : null
            }
          />
          <div className="overflow-x-auto">
            {data?.invoices && data.invoices.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="px-6 py-3 font-medium">Number</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono text-xs text-[#020617]">
                        {inv.number ?? inv.id.slice(0, 10)}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {inv.created ? new Date(inv.created * 1000).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-3 tabular-nums text-[#020617]">
                        {inv.amount_paid != null
                          ? `${(inv.amount_paid / 100).toLocaleString('en-US', {
                              style: 'currency',
                              currency: (inv.currency ?? 'usd').toUpperCase(),
                            })}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
                            inv.status === 'paid'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700',
                          )}
                        >
                          {inv.status ?? 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-[#0369A1] hover:underline"
                          >
                            PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                No invoices yet. Invoices will appear here after your first billing cycle.
              </div>
            )}
          </div>
        </SettingsCard>

        {/* Plan comparison CTA */}
        {(plan === 'trial' || plan === 'explorer') && (
          <SettingsCard className="border-sky-100 bg-sky-50/30">
            <SettingsCardBody className="text-center py-8">
              <h3 className="font-display text-lg font-bold text-[#020617] mb-1">Ready to upgrade?</h3>
              <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                Talk to our team about expanding units, locations, or integrations to fit your portfolio.
              </p>
              <Link
                href="/settings/billing/upgrade"
                className={cn(settingsPrimaryButtonClass, 'mx-auto')}
              >
                Talk to Sales
                <ArrowRight size={14} />
              </Link>
            </SettingsCardBody>
          </SettingsCard>
        )}
      </div>
    </SettingsShell>
  );
}
