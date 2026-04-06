'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, ArrowRight, Zap, Shield, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    price: 5,
    annualPrice: 4,
    description: 'For small portfolios getting started with AI',
    color: '#6B7B8D',
    features: {
      units: 'Up to 50 units',
      agents: '3 AI agents',
      voice: false,
      acquisitions: false,
      reports: 'Basic reporting',
      compliance: true,
      team: '1 team member',
      priority: false,
    },
    cta: 'Start Free Trial',
    href: '/api/stripe/checkout?plan=starter',
    popular: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: Shield,
    price: 5,
    annualPrice: 4,
    description: 'Full automation for growing portfolios',
    color: '#00D4AA',
    features: {
      units: 'Up to 500 units',
      agents: 'All 5 AI agents',
      voice: true,
      acquisitions: true,
      reports: 'AI owner reports',
      compliance: true,
      team: '10 team members',
      priority: false,
    },
    cta: 'Start Free Trial',
    href: '/api/stripe/checkout?plan=growth',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    price: -1,
    annualPrice: -1,
    description: 'For large operators and management companies',
    color: '#8A00FF',
    features: {
      units: 'Unlimited units',
      agents: 'All 5 AI agents',
      voice: true,
      acquisitions: true,
      reports: 'White-label reports',
      compliance: true,
      team: 'Unlimited members',
      priority: true,
    },
    cta: 'Contact Sales',
    href: 'tel:+14847391152',
    popular: false,
  },
];

const featureRows = [
  { label: 'Units', key: 'units' },
  { label: 'AI Agents', key: 'agents' },
  { label: 'Voice AI (24/7)', key: 'voice' },
  { label: 'Acquisitions Module', key: 'acquisitions' },
  { label: 'Owner Reports', key: 'reports' },
  { label: 'Fair Housing Compliance', key: 'compliance' },
  { label: 'Team Members', key: 'team' },
  { label: 'Priority Support', key: 'priority' },
];

const faqs = [
  {
    q: 'What\'s included in the free trial?',
    a: '14-day free trial with full access. No credit card required. Import your properties and see AI in action.',
  },
  {
    q: 'How does per-unit pricing work?',
    a: 'You pay based on total units under management. Add or remove units anytime — billing adjusts automatically.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes. Upgrade or downgrade anytime from your billing dashboard. Changes take effect immediately.',
  },
  {
    q: 'Do you integrate with my PM software?',
    a: 'We integrate with AppFolio, Buildium, Yardi, RealPage, Entrata, and more. Or import via CSV.',
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
            <Link href="/signup" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,170,0.06)_0%,_transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
              Pricing that scales with your portfolio
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-text-secondary">
              Start with a 14-day free trial. No setup fees, no contracts. $5/unit/month — that&apos;s it.
            </p>
          </motion.div>

          {/* Annual toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-bg-secondary/60 backdrop-blur-sm px-4 py-2"
          >
            <span className={cn('text-xs font-medium transition-colors', !annual ? 'text-text-primary' : 'text-text-muted')}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative h-5 w-10 rounded-full bg-bg-elevated transition-colors"
              style={annual ? { backgroundColor: 'rgba(0,212,170,0.3)' } : {}}
            >
              <motion.div
                className="absolute top-0.5 h-4 w-4 rounded-full bg-accent"
                animate={{ left: annual ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={cn('text-xs font-medium transition-colors', annual ? 'text-text-primary' : 'text-text-muted')}>
              Annual
            </span>
            {annual && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent"
              >
                Save 20%
              </motion.span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tiers.map((tier, i) => {
            const price = annual ? tier.annualPrice : tier.price;
            const isPopular = tier.popular;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
                className={cn(
                  'relative rounded-2xl border p-6 transition-all',
                  isPopular
                    ? 'border-accent/40 bg-bg-secondary/80 backdrop-blur-lg shadow-[0_0_40px_rgba(0,212,170,0.08)]'
                    : 'border-border bg-bg-secondary/40 backdrop-blur-sm hover:border-border-hover',
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold text-bg-primary uppercase tracking-wider">
                      <Sparkles size={10} />
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${tier.color}15` }}
                    >
                      <tier.icon size={16} style={{ color: tier.color }} />
                    </div>
                    <h3 className="font-display text-lg font-bold text-text-primary">{tier.name}</h3>
                  </div>
                  <p className="text-xs text-text-muted">{tier.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {price === -1 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold text-text-primary">Custom</span>
                    </div>
                  ) : price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold text-text-primary">$0</span>
                      <span className="text-xs text-text-muted">/forever</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold text-text-primary">${price}</span>
                      <span className="text-xs text-text-muted">/unit/mo</span>
                      {annual && (
                        <span className="ml-2 text-xs text-text-muted line-through">${tier.price}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={tier.href}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all w-full mb-6',
                    isPopular
                      ? 'bg-accent text-bg-primary hover:bg-accent-hover shadow-[0_0_20px_rgba(0,212,170,0.2)]'
                      : 'border border-border bg-bg-elevated text-text-primary hover:bg-bg-tertiary hover:border-border-hover',
                  )}
                >
                  {tier.cta}
                  <ArrowRight size={14} />
                </Link>

                {/* Features */}
                <div className="space-y-2.5">
                  {Object.entries(tier.features).map(([key, value]) => {
                    const row = featureRows.find((r) => r.key === key);
                    if (!row) return null;
                    const isBoolean = typeof value === 'boolean';
                    return (
                      <div key={key} className="flex items-center gap-2">
                        {isBoolean ? (
                          value ? (
                            <Check size={13} className="text-accent shrink-0" />
                          ) : (
                            <X size={13} className="text-text-muted/40 shrink-0" />
                          )
                        ) : (
                          <Check size={13} className="text-accent shrink-0" />
                        )}
                        <span className={cn(
                          'text-xs',
                          isBoolean && !value ? 'text-text-muted/40' : 'text-text-secondary',
                        )}>
                          {isBoolean ? row.label : value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-card overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-lg font-bold text-text-primary">Full Feature Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-text-muted font-medium uppercase tracking-wider">Feature</th>
                  {tiers.map((t) => (
                    <th key={t.id} className="px-5 py-3 text-center font-semibold" style={{ color: t.color }}>
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, i) => (
                  <tr key={row.key} className={cn('border-b border-border/50', i % 2 === 0 && 'bg-bg-elevated/20')}>
                    <td className="px-5 py-2.5 text-text-secondary">{row.label}</td>
                    {tiers.map((t) => {
                      const v = t.features[row.key as keyof typeof t.features];
                      return (
                        <td key={t.id} className="px-5 py-2.5 text-center">
                          {typeof v === 'boolean' ? (
                            v ? <Check size={14} className="mx-auto text-accent" /> : <X size={14} className="mx-auto text-text-muted/30" />
                          ) : (
                            <span className="text-text-primary font-mono">{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="font-display text-2xl font-bold text-text-primary text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full glass-card p-4 text-left hover:border-border-hover transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">{faq.q}</h3>
                  <motion.span
                    animate={{ rotate: expandedFaq === i ? 45 : 0 }}
                    className="text-text-muted text-lg shrink-0 ml-3"
                  >
                    +
                  </motion.span>
                </div>
                {expandedFaq === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 text-xs text-text-secondary leading-relaxed"
                  >
                    {faq.a}
                  </motion.p>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} RKV Consulting by RKV. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
