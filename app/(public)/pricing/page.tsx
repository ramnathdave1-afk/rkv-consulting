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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0F172A]">
              <span className="text-xs font-bold text-white">R</span>
            </div>
            <span className="font-display text-sm font-bold text-[#0F172A]">RKV Consulting</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Sign In
            </Link>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-[#0369A1] px-4 h-9 inline-flex items-center text-sm font-semibold text-white hover:bg-[#0284C7] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero — dark navy */}
      <section className="bg-[#0F172A] text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight text-white">
              Custom Pricing for Property Management Teams
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl md:text-2xl text-slate-300 leading-relaxed">
              Every PM company is different. Tell us about your portfolio and we&rsquo;ll build a
              plan that fits &mdash; pricing typically scales with units managed.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-6 h-12 font-semibold cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
            >
              <Calendar size={16} />
              Book a Demo
              <ArrowRight size={14} />
            </a>
            <a
              href="#talk-to-sales"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 hover:border-slate-500 bg-transparent px-6 h-12 font-semibold text-white cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
            >
              <MessageSquare size={16} />
              Talk to Sales
            </a>
          </motion.div>
        </div>
      </section>

      {/* Tier overview cards (informational, no prices) */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PUBLIC_TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="font-display text-xl font-bold text-[#0F172A]">{tier.name}</h3>
              <p className="mt-1.5 text-sm text-[#475569]">{tier.blurb}</p>
              <ul className="mt-5 space-y-2.5 text-sm text-[#020617]">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#0369A1] shrink-0" />
                  <span>{tier.unitsLabel}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#0369A1] shrink-0" />
                  <span>{tier.usersLabel}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#0369A1] shrink-0" />
                  <span>See full feature list below</span>
                </li>
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Table — what's included at each tier */}
      <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="p-6 border-b border-slate-200">
            <h2 className="font-display text-2xl font-bold text-[#0F172A]">What&rsquo;s Included</h2>
            <p className="mt-1.5 text-sm text-[#475569]">
              Capabilities by tier. Final pricing is set during your discovery call.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-[#475569] font-medium uppercase tracking-wider text-xs">Feature</th>
                  {PLAN_TIER_ORDER.filter((t) => t !== 'trial').map((t) => (
                    <th key={t} className="px-5 py-3 text-center font-semibold text-[#0F172A] text-xs uppercase tracking-wider">
                      {PLANS[t].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((f, i) => (
                  <tr
                    key={f}
                    className={cn('border-b border-slate-100', i % 2 === 1 && 'bg-slate-50/50')}
                  >
                    <td className="px-5 py-3 text-[#020617]">{FEATURE_LABELS[f]}</td>
                    {PLAN_TIER_ORDER.filter((t) => t !== 'trial').map((t) => (
                      <td key={t} className="px-5 py-3 text-center">
                        {PLANS[t].features[f] ? (
                          <Check size={16} className="mx-auto text-[#0369A1]" />
                        ) : (
                          <X size={16} className="mx-auto text-slate-300" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </section>

      {/* Talk to Sales form */}
      <section id="talk-to-sales" className="mx-auto max-w-2xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#020617]">Talk to Sales</h2>
            <p className="mt-3 text-base text-[#475569]">
              Tell us about your portfolio. We&rsquo;ll come back with a custom proposal within
              one business day.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0369A1]/10">
                <Check className="text-[#0369A1]" size={20} />
              </div>
              <h3 className="font-display text-lg font-bold text-[#0F172A]">Thanks &mdash; we&rsquo;ll be in touch</h3>
              <p className="mt-2 text-sm text-[#475569]">
                A team member will reach out within one business day. In the meantime, you can{' '}
                <a href={CAL_LINK} target="_blank" rel="noreferrer" className="text-[#0369A1] hover:underline cursor-pointer">
                  grab time on the calendar
                </a>{' '}
                directly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field name="name" label="Name" required />
                <Field name="email" label="Email" type="email" required />
              </div>
              <Field name="company" label="Company" />

              <div>
                <label htmlFor="portfolio_size" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                  Portfolio size
                </label>
                <select
                  id="portfolio_size"
                  name="portfolio_size"
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-[#020617] focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 cursor-pointer"
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
                <label htmlFor="message" className="block text-sm font-medium text-[#0F172A] mb-1.5">
                  What problem are you trying to solve? <span className="text-[#0369A1]">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 resize-none"
                  placeholder="Leasing response time, maintenance dispatch, owner reporting, etc."
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0369A1] hover:bg-[#0284C7] text-white px-6 h-12 font-semibold disabled:opacity-60 cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
              >
                {submitting ? 'Sending…' : 'Talk to Sales'}
                {!submitting && <ArrowRight size={14} />}
              </button>
              <p className="text-xs text-[#475569] text-center">
                Or{' '}
                <a href={CAL_LINK} target="_blank" rel="noreferrer" className="text-[#0369A1] hover:underline cursor-pointer">
                  book a demo directly
                </a>{' '}
                if you&rsquo;d rather skip the form.
              </p>
            </form>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#475569]">
            &copy; {new Date().getFullYear()} RKV Consulting by RKV. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <StatusBadge />
            <Link href="/terms" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">
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
      <label htmlFor={name} className="block text-sm font-medium text-[#0F172A] mb-1.5">
        {label} {required && <span className="text-[#0369A1]">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-[#020617] placeholder:text-slate-400 focus:border-[#0369A1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
      />
    </div>
  );
}
