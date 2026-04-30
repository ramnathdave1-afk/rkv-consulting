'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, Calendar, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/landing/StatusBadge';
import { PLANS, PLAN_TIER_ORDER, FEATURE_LABELS, type FeatureKey } from '@/lib/billing/plans';

// Public-facing tiers are now informational only — they describe what's
// included at each tier, but pricing is negotiated 1:1 with sales. Keep
// this in sync with PLANS so the feature columns can't drift.
const PUBLIC_TIERS = (['starter', 'growth', 'enterprise'] as const).map((t) => ({
  id: t,
  name: PLANS[t].name,
  blurb:
    t === 'starter'
      ? 'For small portfolios getting started with AI'
      : t === 'growth'
        ? 'Full automation for growing portfolios'
        : 'For large operators and management companies',
  unitsLabel:
    PLANS[t].max_units === 0
      ? 'Unlimited units'
      : `Up to ${PLANS[t].max_units.toLocaleString()} units`,
  usersLabel:
    PLANS[t].max_users === 0
      ? 'Unlimited team members'
      : `${PLANS[t].max_users} team members`,
}));

// Feature rows shown in the comparison table — purely informational.
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

const PORTFOLIO_SIZES = ['50-100', '100-500', '500-2000', '2000+'] as const;

const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK || 'https://cal.com/rkv-consulting/demo';

export default function PricingPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') ?? '').trim(),
      email: String(fd.get('email') ?? '').trim(),
      company: String(fd.get('company') ?? '').trim(),
      portfolio_size: String(fd.get('portfolio_size') ?? '').trim(),
      current_software: String(fd.get('current_software') ?? '').trim(),
      message: String(fd.get('message') ?? '').trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setError('Name, email, and message are required.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/contact/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">RKV Consulting</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Sign In
            </Link>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,170,0.06)_0%,_transparent_50%)]" />
        <div className="relative mx-auto max-w-3xl px-6 pt-20 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
              Custom Pricing for Property Management Teams
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-secondary leading-relaxed">
              Every PM company is different. Tell us about your portfolio and we&rsquo;ll build a
              plan that fits &mdash; pricing typically scales with units managed.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg-primary hover:bg-accent-hover shadow-[0_0_20px_rgba(0,212,170,0.18)] transition-all"
            >
              <Calendar size={16} />
              Book a Demo
              <ArrowRight size={14} />
            </a>
            <a
              href="#talk-to-sales"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-5 py-3 text-sm font-semibold text-text-primary hover:bg-bg-tertiary hover:border-border-hover transition-all"
            >
              <MessageSquare size={16} />
              Talk to Sales
            </a>
          </motion.div>
        </div>
      </div>

      {/* Tier overview cards (informational, no prices) */}
      <div className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PUBLIC_TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="rounded-2xl border border-border bg-bg-secondary/40 backdrop-blur-sm p-6"
            >
              <h3 className="font-display text-lg font-bold text-text-primary">{tier.name}</h3>
              <p className="mt-1 text-xs text-text-muted">{tier.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-accent shrink-0" />
                  <span>{tier.unitsLabel}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-accent shrink-0" />
                  <span>{tier.usersLabel}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-accent shrink-0" />
                  <span>See full feature list below</span>
                </li>
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Comparison Table — what's included at each tier */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-card overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-lg font-bold text-text-primary">What&rsquo;s Included</h2>
            <p className="mt-1 text-xs text-text-muted">
              Capabilities by tier. Final pricing is set during your discovery call.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-text-muted font-medium uppercase tracking-wider">Feature</th>
                  {PLAN_TIER_ORDER.filter((t) => t !== 'trial').map((t) => (
                    <th key={t} className="px-5 py-3 text-center font-semibold text-text-primary">
                      {PLANS[t].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((f, i) => (
                  <tr
                    key={f}
                    className={cn('border-b border-border/50', i % 2 === 0 && 'bg-bg-elevated/20')}
                  >
                    <td className="px-5 py-2.5 text-text-secondary">{FEATURE_LABELS[f]}</td>
                    {PLAN_TIER_ORDER.filter((t) => t !== 'trial').map((t) => (
                      <td key={t} className="px-5 py-2.5 text-center">
                        {PLANS[t].features[f] ? (
                          <Check size={14} className="mx-auto text-accent" />
                        ) : (
                          <X size={14} className="mx-auto text-text-muted/30" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Talk to Sales form */}
      <div id="talk-to-sales" className="mx-auto max-w-2xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-text-primary">Talk to Sales</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Tell us about your portfolio. We&rsquo;ll come back with a custom proposal within
              one business day.
            </p>
          </div>

          {submitted ? (
            <div className="glass-card p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                <Check className="text-accent" size={20} />
              </div>
              <h3 className="font-display text-lg font-bold text-text-primary">Thanks &mdash; we&rsquo;ll be in touch</h3>
              <p className="mt-2 text-sm text-text-secondary">
                A team member will reach out within one business day. In the meantime, you can{' '}
                <a href={CAL_LINK} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  grab time on the calendar
                </a>{' '}
                directly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field name="name" label="Name" required />
                <Field name="email" label="Email" type="email" required />
              </div>
              <Field name="company" label="Company" />

              <div>
                <label htmlFor="portfolio_size" className="block text-xs font-medium text-text-secondary mb-1.5">
                  Portfolio size
                </label>
                <select
                  id="portfolio_size"
                  name="portfolio_size"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a range
                  </option>
                  {PORTFOLIO_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} units
                    </option>
                  ))}
                </select>
              </div>

              <Field
                name="current_software"
                label="Current PM software"
                placeholder="AppFolio, Buildium, Yardi, etc."
              />

              <div>
                <label htmlFor="message" className="block text-xs font-medium text-text-secondary mb-1.5">
                  What problem are you trying to solve? <span className="text-accent">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  placeholder="Leasing response time, maintenance dispatch, owner reporting, etc."
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg-primary hover:bg-accent-hover disabled:opacity-60 transition-all"
              >
                {submitting ? 'Sending…' : 'Talk to Sales'}
                {!submitting && <ArrowRight size={14} />}
              </button>
              <p className="text-[11px] text-text-muted text-center">
                Or{' '}
                <a href={CAL_LINK} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  book a demo directly
                </a>{' '}
                if you&rsquo;d rather skip the form.
              </p>
            </form>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} RKV Consulting by RKV. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <StatusBadge />
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-text-secondary mb-1.5">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}
