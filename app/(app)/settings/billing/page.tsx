'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUpRight, Shield, Zap, Building2, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

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
}

const featureLabels: Record<string, { label: string; icon: string }> = {
  sites: { label: 'Sites', icon: '🏗️' },
  api_calls: { label: 'API Calls', icon: '⚡' },
  feasibility: { label: 'Feasibility Analyses', icon: '🔍' },
  chat_messages: { label: 'AI Chat Messages', icon: '💬' },
  team_members: { label: 'Team Members', icon: '👥' },
  pdf_reports: { label: 'PDF Reports', icon: '📄' },
};

const planConfig: Record<string, { name: string; color: string; icon: typeof Zap; price: string }> = {
  explorer: { name: 'Explorer', color: '#6B7B8D', icon: Zap, price: 'Free' },
  pro: { name: 'Pro', color: '#00D4AA', icon: Shield, price: '$199/mo' },
  enterprise: { name: 'Enterprise', color: '#8A00FF', icon: Building2, price: 'Custom' },
};

function UsageMeter({ label, icon, used, limit }: { label: string; icon: string; used: number; limit: number }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">{label}</span>
        </div>
        <span className={cn(
          'text-xs font-mono font-semibold',
          isAtLimit ? 'text-danger' : isNearLimit ? 'text-warning' : 'text-text-primary',
        )}>
          {isUnlimited ? (
            <span className="text-accent">Unlimited</span>
          ) : (
            `${used.toLocaleString()} / ${limit.toLocaleString()}`
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              backgroundColor: isAtLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : '#00D4AA',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="h-48 w-full max-w-2xl rounded-xl bg-bg-elevated animate-pulse" /></div>}>
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

  const handleCheckout = async (plan: string) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, interval: 'monthly' }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setPortalLoading(false);
  };

  const plan = data?.subscription?.plan || 'explorer';
  const config = planConfig[plan] || planConfig.explorer;
  const PlanIcon = config.icon;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-32 rounded bg-bg-elevated animate-pulse" />
        <div className="h-48 w-full max-w-2xl rounded-xl bg-bg-elevated animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Billing & Usage</h1>
        <p className="text-sm text-text-secondary">Manage your subscription and track usage</p>
      </div>

      {/* Success/Cancel banners */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3"
        >
          <CheckCircle2 size={16} className="text-accent" />
          <span className="text-sm text-accent font-medium">Subscription activated! Welcome to {config.name}.</span>
        </motion.div>
      )}
      {canceled && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3"
        >
          <AlertTriangle size={16} className="text-warning" />
          <span className="text-sm text-warning font-medium">Checkout was canceled. No changes were made.</span>
        </motion.div>
      )}

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.03]"
          style={{ backgroundColor: config.color, filter: 'blur(40px)' }}
        />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <PlanIcon size={20} style={{ color: config.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-text-primary">{config.name}</h2>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: config.color, backgroundColor: `${config.color}15` }}
                  >
                    {data?.subscription?.status || 'active'}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {config.price}
                  {data?.subscription?.current_period_end && (
                    <> · Renews {new Date(data.subscription.current_period_end).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {plan !== 'enterprise' && (
                <button
                  onClick={() => handleCheckout(plan === 'explorer' ? 'pro' : 'enterprise')}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
                >
                  <ArrowUpRight size={12} />
                  Upgrade
                </button>
              )}
              {data?.subscription?.stripe_customer_id && (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                >
                  <ExternalLink size={12} />
                  {portalLoading ? 'Loading...' : 'Manage'}
                </button>
              )}
            </div>
          </div>

          {data?.subscription?.cancel_at_period_end && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2">
              <AlertTriangle size={12} className="text-warning" />
              <span className="text-xs text-warning">
                Your subscription will cancel at the end of the current period.
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Usage Meters */}
      {data?.usage && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-text-muted" />
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider">Current Period Usage</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(data.usage).map(([feature, usage]) => {
              const meta = featureLabels[feature];
              if (!meta) return null;
              return (
                <UsageMeter
                  key={feature}
                  label={meta.label}
                  icon={meta.icon}
                  used={usage.used}
                  limit={usage.limit}
                />
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Plan Comparison CTA */}
      {plan === 'explorer' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 text-center"
          style={{ borderColor: 'rgba(0,212,170,0.15)' }}
        >
          <h3 className="font-display text-sm font-bold text-text-primary mb-1">Unlock Full Power</h3>
          <p className="text-xs text-text-muted mb-4">
            Upgrade to Pro for unlimited analyses, AI chat, and all data sources.
          </p>
          <button
            onClick={() => handleCheckout('pro')}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
          >
            <Zap size={14} />
            Start Pro — $199/mo
          </button>
        </motion.div>
      )}
    </div>
  );
}
