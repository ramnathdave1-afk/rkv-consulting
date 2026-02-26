'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import * as Accordion from '@radix-ui/react-accordion'
import { Check, X, ChevronDown, Zap, Shield, Crown, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type BillingPeriod = 'monthly' | 'annual'

interface PlanFeature {
  text: string
  included: boolean
  badge?: string
  badgeColor?: 'gold' | 'green' | 'muted'
  tooltip?: string
}

interface PricingPlan {
  id: 'basic' | 'pro' | 'elite'
  label: string
  labelColor: string
  name: string
  monthlyPrice: number
  annualPrice: number
  annualMonthly: number
  description: string
  features: PlanFeature[]
  ctaText: string
  ctaStyle: 'ghost' | 'gold' | 'green'
  popular?: boolean
  icon: React.ReactNode
  borderColor: string
  priceColor: string
}

/* ================================================================== */
/*  PLAN DATA                                                          */
/* ================================================================== */

const plans: PricingPlan[] = [
  {
    id: 'basic',
    label: 'Starter',
    labelColor: 'text-muted',
    name: 'Basic',
    monthlyPrice: 20,
    annualPrice: 192,
    annualMonthly: 16,
    description: 'For investors just getting started',
    icon: <Shield className="w-5 h-5" />,
    borderColor: 'border-border',
    priceColor: 'text-white',
    ctaText: 'Start with Basic',
    ctaStyle: 'ghost',
    features: [
      { text: 'Up to 3 properties', included: true },
      { text: '5 deal analyses per month', included: true },
      { text: 'Basic tenant management (10 tenants)', included: true },
      { text: 'Deal pipeline (10 deals)', included: true },
      { text: 'Basic document storage', included: true },
      { text: 'Mobile access', included: true },
      { text: 'AI Assistant', included: false, badge: 'Pro+', badgeColor: 'gold' },
      { text: 'Tenant Screening', included: false, badge: 'locked', badgeColor: 'muted' },
      { text: 'Market Intelligence & Heat Map', included: false, badge: 'locked', badgeColor: 'muted' },
      { text: 'Accounting Center', included: false, badge: 'locked', badgeColor: 'muted' },
      { text: 'Contractor Network', included: false, badge: 'locked', badgeColor: 'muted' },
      { text: 'AI Voice & Email Agents', included: false, badge: 'Elite only', badgeColor: 'gold' },
    ],
  },
  {
    id: 'pro',
    label: 'Most Popular',
    labelColor: 'text-gold',
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 950,
    annualMonthly: 79,
    description: 'For serious investors scaling their portfolio',
    icon: <Zap className="w-5 h-5" />,
    borderColor: 'border-gold',
    priceColor: 'text-gold',
    popular: true,
    ctaText: 'Start with Pro',
    ctaStyle: 'gold',
    features: [
      { text: 'Up to 20 properties', included: true },
      { text: '50 deal analyses per month', included: true },
      { text: 'Full tenant management (100 tenants)', included: true },
      { text: 'AI Assistant (200 messages/month)', included: true },
      { text: 'Live market intelligence + heat map', included: true },
      { text: 'Time analysis & performance charts', included: true },
      { text: 'Accounting & tax center', included: true },
      { text: 'Financing hub', included: true },
      { text: 'Contractor network & auto-bidding', included: true },
      { text: 'Tenant screening', included: true },
      { text: 'Full document vault', included: true },
      { text: 'Zoning intelligence', included: true },
      { text: 'Exit strategy planner', included: true },
      { text: 'Bulk portfolio import', included: true },
      { text: 'AI Voice Agent', included: false, badge: 'Elite only', badgeColor: 'gold', tooltip: 'Available on the Elite plan. AI calls tenants and handles disputes automatically.' },
      { text: 'AI Email Automation', included: false, badge: 'Elite only', badgeColor: 'gold' },
      { text: 'Autopilot Mode', included: false, badge: 'locked', badgeColor: 'muted' },
      { text: 'Unlimited properties', included: false, badge: 'locked', badgeColor: 'muted' },
      { text: 'Syndication tools', included: false, badge: 'locked', badgeColor: 'muted' },
    ],
  },
  {
    id: 'elite',
    label: 'Full Autopilot',
    labelColor: 'text-green',
    name: 'Elite',
    monthlyPrice: 199,
    annualPrice: 1910,
    annualMonthly: 159,
    description: 'For professional investors who want everything automated',
    icon: <Crown className="w-5 h-5" />,
    borderColor: 'border-green',
    priceColor: 'text-white',
    ctaText: 'Go Elite',
    ctaStyle: 'green',
    features: [
      { text: 'Unlimited properties', included: true },
      { text: 'Unlimited deal analyses', included: true },
      { text: 'Unlimited AI messages', included: true },
      { text: 'Everything in Pro', included: true },
      { text: 'AI Voice Agent — calls tenants, handles disputes', included: true },
      { text: 'AI Email Automation — full sequence management', included: true },
      { text: 'AI SMS Agent — 24/7 instant responses', included: true },
      { text: 'Autopilot Mode — AI runs everything', included: true },
      { text: 'Syndication tools & investor reporting', included: true },
      { text: 'Priority support', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'White label (coming soon)', included: true },
      { text: 'Early access to all new features', included: true },
    ],
  },
]

/* ================================================================== */
/*  FEATURE COMPARISON TABLE DATA                                      */
/* ================================================================== */

interface ComparisonRow {
  feature: string
  basic: string | boolean
  pro: string | boolean
  elite: string | boolean
}

interface ComparisonCategory {
  name: string
  rows: ComparisonRow[]
}

const comparisonData: ComparisonCategory[] = [
  {
    name: 'Core',
    rows: [
      { feature: 'Properties', basic: '3', pro: '20', elite: 'Unlimited' },
      { feature: 'Deal Pipeline', basic: '10 deals', pro: '100 deals', elite: 'Unlimited' },
      { feature: 'Document Storage', basic: 'Basic', pro: 'Full Vault', elite: 'Full Vault' },
      { feature: 'Mobile Access', basic: true, pro: true, elite: true },
      { feature: 'Portfolio Dashboard', basic: true, pro: true, elite: true },
    ],
  },
  {
    name: 'Analysis',
    rows: [
      { feature: 'Deal Analyses / Month', basic: '5', pro: '50', elite: 'Unlimited' },
      { feature: 'Market Intelligence', basic: false, pro: true, elite: true },
      { feature: 'Live Heat Map', basic: false, pro: true, elite: true },
      { feature: 'Time Analysis', basic: false, pro: true, elite: true },
      { feature: 'Zoning Intelligence', basic: false, pro: true, elite: true },
      { feature: 'Exit Strategy Planner', basic: false, pro: true, elite: true },
      { feature: 'Portfolio Benchmarking', basic: false, pro: true, elite: true },
    ],
  },
  {
    name: 'Management',
    rows: [
      { feature: 'Tenant Management', basic: '10 tenants', pro: '100 tenants', elite: 'Unlimited' },
      { feature: 'Tenant Screening', basic: false, pro: true, elite: true },
      { feature: 'Accounting & Tax Center', basic: false, pro: true, elite: true },
      { feature: 'Financing Hub', basic: false, pro: true, elite: true },
      { feature: 'Contractor Network', basic: false, pro: true, elite: true },
      { feature: 'Bulk Portfolio Import', basic: false, pro: true, elite: true },
    ],
  },
  {
    name: 'AI & Automation',
    rows: [
      { feature: 'AI Assistant Messages', basic: false, pro: '200/mo', elite: 'Unlimited' },
      { feature: 'AI Voice Agent', basic: false, pro: false, elite: true },
      { feature: 'AI Email Automation', basic: false, pro: false, elite: true },
      { feature: 'AI SMS Agent', basic: false, pro: false, elite: true },
      { feature: 'Autopilot Mode', basic: false, pro: false, elite: true },
      { feature: 'AI Deal Recommendations', basic: false, pro: true, elite: true },
      { feature: 'Live Rent Autofill', basic: false, pro: true, elite: true },
    ],
  },
  {
    name: 'Advanced',
    rows: [
      { feature: 'Syndication Tools', basic: false, pro: false, elite: true },
      { feature: 'Investor Reporting', basic: false, pro: false, elite: true },
      { feature: 'Priority Support', basic: false, pro: false, elite: true },
      { feature: 'Dedicated Account Manager', basic: false, pro: false, elite: true },
      { feature: 'White Label', basic: false, pro: false, elite: 'Coming Soon' },
      { feature: 'Early Access Features', basic: false, pro: false, elite: true },
    ],
  },
]

/* ================================================================== */
/*  FAQ DATA                                                           */
/* ================================================================== */

const faqItems = [
  {
    question: 'Can I change plans anytime?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. When you upgrade, the new features are available immediately and we prorate the cost. When you downgrade, the change takes effect at the end of your current billing cycle so you keep access until then.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes, every plan comes with a 14-day free trial. You get full access to all features in your chosen plan during the trial period. No credit card is required to start, and you can cancel anytime before the trial ends without being charged.',
  },
  {
    question: 'What happens if I exceed my property limit?',
    answer:
      "You'll be prompted to upgrade to the next plan when you try to add a property beyond your limit. Your existing properties and data remain safe and accessible -- you simply won't be able to add new ones until you upgrade or remove an existing property.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Absolutely. You can cancel your subscription with one click from your account settings. There are no cancellation fees, no long-term contracts, and no hidden charges. Your data is retained for 30 days after cancellation in case you decide to come back.',
  },
  {
    question: 'Do you offer annual billing?',
    answer:
      'Yes, we offer annual billing with a 20% discount on all plans. When you switch to annual billing, the savings are applied immediately. You can switch between monthly and annual billing at any time from your account settings.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through our secure payment processor, Stripe. All transactions are encrypted with bank-level security. We also support Apple Pay and Google Pay for your convenience.',
  },
]

/* ================================================================== */
/*  STRIPE PRICE IDS (replace with real IDs)                           */
/* ================================================================== */

const STRIPE_PRICES: Record<string, Record<BillingPeriod, string>> = {
  basic: {
    monthly: 'price_basic_monthly',
    annual: 'price_basic_annual',
  },
  pro: {
    monthly: 'price_pro_monthly',
    annual: 'price_pro_annual',
  },
  elite: {
    monthly: 'price_elite_monthly',
    annual: 'price_elite_annual',
  },
}

/* ================================================================== */
/*  INNER COMPONENT (uses useSearchParams)                             */
/* ================================================================== */

function PricingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Auto-trigger checkout for new signups                            */
  /* ---------------------------------------------------------------- */

  const triggerCheckout = useCallback(
    async (planId: string, period: BillingPeriod) => {
      setLoadingPlan(planId)
      try {
        const priceId = STRIPE_PRICES[planId][period]
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        }
      } catch {
        // Silently handle — user can retry
      } finally {
        setLoadingPlan(null)
      }
    },
    []
  )

  useEffect(() => {
    const isNew = searchParams.get('new')
    const plan = searchParams.get('plan')
    if (isNew === 'true' && plan) {
      triggerCheckout(plan, billing)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  /* ---------------------------------------------------------------- */
  /*  Handle CTA click                                                 */
  /* ---------------------------------------------------------------- */

  const handleCTAClick = async (planId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push(`/signup?plan=${planId}`)
      return
    }

    triggerCheckout(planId, billing)
  }

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                   */
  /* ---------------------------------------------------------------- */

  const renderBadge = (badge: string, color: 'gold' | 'green' | 'muted') => {
    const colorMap = {
      gold: 'bg-gold/10 text-gold border-gold/20',
      green: 'bg-green/10 text-green border-green/20',
      muted: 'bg-border text-muted border-border',
    }
    return (
      <span
        className={cn(
          'ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
          colorMap[color]
        )}
      >
        {badge}
      </span>
    )
  }

  const renderComparisonCell = (value: string | boolean) => {
    if (value === true) {
      return <Check className="w-4 h-4 text-green mx-auto" />
    }
    if (value === false) {
      return <X className="w-4 h-4 text-muted/40 mx-auto" />
    }
    return <span className="text-sm text-white font-body">{value}</span>
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-black font-body">
      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Brand */}
          <motion.p
            className="text-gold font-display font-semibold text-sm tracking-widest uppercase mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            RKV Consulting
          </motion.p>

          {/* Heading */}
          <motion.h1
            className="font-display font-bold text-4xl md:text-5xl text-white leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Simple, Transparent Pricing.
          </motion.h1>

          {/* Subhead */}
          <motion.p
            className="text-muted text-lg mt-4 max-w-xl mx-auto font-body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Choose the plan that matches your ambition. Upgrade or cancel anytime.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            className="mt-10 inline-flex items-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <span
              className={cn(
                'text-sm font-medium transition-colors',
                billing === 'monthly' ? 'text-white' : 'text-muted'
              )}
            >
              Monthly
            </span>

            {/* Pill toggle */}
            <button
              onClick={() =>
                setBilling((prev) => (prev === 'monthly' ? 'annual' : 'monthly'))
              }
              className={cn(
                'relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
                billing === 'annual' ? 'bg-gold' : 'bg-border'
              )}
              aria-label="Toggle billing period"
            >
              <motion.div
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md"
                animate={{ x: billing === 'annual' ? 28 : 0 }}
                transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
              />
            </button>

            <span
              className={cn(
                'text-sm font-medium transition-colors',
                billing === 'annual' ? 'text-white' : 'text-muted'
              )}
            >
              Annual
            </span>

            {/* Save badge */}
            <AnimatePresence>
              {billing === 'annual' && (
                <motion.span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gold/15 text-gold border border-gold/25"
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  Save 20%
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PRICING CARDS                                                */}
      {/* ============================================================ */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-start justify-center">
          {plans.map((plan, index) => {
            const isPopular = plan.popular
            const isElite = plan.id === 'elite'
            const price =
              billing === 'monthly' ? plan.monthlyPrice : plan.annualMonthly
            const isLoading = loadingPlan === plan.id

            return (
              <motion.div
                key={plan.id}
                className={cn(
                  'relative w-full lg:w-1/3 rounded-2xl p-8',
                  'bg-card',
                  isPopular ? 'border-2 border-gold lg:-mt-4 lg:scale-105' : 'border',
                  isPopular ? '' : plan.borderColor,
                  'transition-all duration-300'
                )}
                style={
                  isPopular
                    ? {
                        boxShadow: '0 0 40px rgba(201,168,76,0.15)',
                      }
                    : undefined
                }
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 * index }}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gold text-black font-display tracking-wide uppercase">
                      <Zap className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan label */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn('opacity-60', plan.labelColor)}>
                    {plan.icon}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold font-display uppercase tracking-wider',
                      plan.labelColor
                    )}
                  >
                    {plan.label}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        'text-5xl font-bold font-display',
                        plan.priceColor
                      )}
                    >
                      ${price}
                    </span>
                    <span className="text-muted text-sm">/mo</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-muted text-xs mt-1">
                      ${plan.annualPrice}/year
                    </p>
                  )}
                </div>

                {/* Description */}
                <p className="text-muted text-sm mb-6 font-body">
                  {plan.description}
                </p>

                {/* Divider */}
                <div className="h-px bg-border mb-6" />

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      {feat.included ? (
                        <Check
                          className={cn(
                            'w-4 h-4 mt-0.5 flex-shrink-0',
                            isElite ? 'text-green' : 'text-green'
                          )}
                        />
                      ) : (
                        <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted/40" />
                      )}
                      <span
                        className={cn(
                          'font-body',
                          feat.included ? 'text-white/90' : 'text-muted/60'
                        )}
                      >
                        {feat.text}
                        {feat.badge && renderBadge(feat.badge, feat.badgeColor || 'muted')}
                        {feat.tooltip && (
                          <span className="relative group inline-block ml-1">
                            <Info className="w-3 h-3 text-muted/50 inline cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-deep border border-border text-xs text-white/80 w-52 text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50 font-body">
                              {feat.tooltip}
                            </span>
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <motion.button
                  onClick={() => handleCTAClick(plan.id)}
                  disabled={isLoading}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-display font-semibold text-sm tracking-wide transition-all duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                    plan.ctaStyle === 'ghost' &&
                      'border border-border text-white hover:border-white/30 hover:bg-white/5 focus-visible:ring-white/30',
                    plan.ctaStyle === 'gold' &&
                      'bg-gold text-black hover:brightness-110 shadow-glow focus-visible:ring-gold/50',
                    plan.ctaStyle === 'green' &&
                      'bg-green text-black hover:brightness-110 focus-visible:ring-green/50',
                    isLoading && 'opacity-60 cursor-not-allowed'
                  )}
                  style={
                    plan.ctaStyle === 'gold'
                      ? { boxShadow: '0 0 30px rgba(201,168,76,0.25)' }
                      : undefined
                  }
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    plan.ctaText
                  )}
                </motion.button>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURE COMPARISON TABLE                                     */}
      {/* ============================================================ */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="font-display font-bold text-3xl text-white text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Compare All Features
          </motion.h2>
          <motion.p
            className="text-muted text-center mb-12 font-body"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            A detailed breakdown of what each plan includes.
          </motion.p>

          <motion.div
            className="overflow-x-auto rounded-2xl border border-border"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <table className="w-full min-w-[640px]">
              {/* Sticky header */}
              <thead>
                <tr className="bg-deep sticky top-0 z-10">
                  <th className="text-left px-6 py-4 font-display font-semibold text-sm text-muted uppercase tracking-wider w-2/5">
                    Feature
                  </th>
                  <th className="text-center px-6 py-4 font-display font-semibold text-sm text-white w-1/5">
                    Basic
                    <span className="block text-xs text-muted font-normal font-body mt-0.5">
                      ${billing === 'monthly' ? '20' : '16'}/mo
                    </span>
                  </th>
                  <th className="text-center px-6 py-4 font-display font-semibold text-sm text-gold w-1/5">
                    Pro
                    <span className="block text-xs text-muted font-normal font-body mt-0.5">
                      ${billing === 'monthly' ? '99' : '79'}/mo
                    </span>
                  </th>
                  <th className="text-center px-6 py-4 font-display font-semibold text-sm text-green w-1/5">
                    Elite
                    <span className="block text-xs text-muted font-normal font-body mt-0.5">
                      ${billing === 'monthly' ? '199' : '159'}/mo
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {comparisonData.map((category) => (
                  <React.Fragment key={category.name}>
                    {/* Category header row */}
                    <tr className="bg-card/80">
                      <td
                        colSpan={4}
                        className="px-6 py-3 font-display font-semibold text-xs text-gold uppercase tracking-widest"
                      >
                        {category.name}
                      </td>
                    </tr>

                    {/* Feature rows */}
                    {category.rows.map((row, rowIndex) => (
                      <tr
                        key={row.feature}
                        className={cn(
                          'border-t border-border/50 transition-colors hover:bg-white/[0.02]',
                          rowIndex % 2 === 0 ? 'bg-card/30' : 'bg-card/10'
                        )}
                      >
                        <td className="px-6 py-3.5 text-sm text-white/80 font-body">
                          {row.feature}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {renderComparisonCell(row.basic)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {renderComparisonCell(row.pro)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {renderComparisonCell(row.elite)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FAQ SECTION                                                  */}
      {/* ============================================================ */}
      <section className="pb-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            className="font-display font-bold text-3xl text-white text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.p
            className="text-muted text-center mb-12 font-body"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Everything you need to know about our pricing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Accordion.Root type="single" collapsible className="space-y-3">
              {faqItems.map((item, index) => (
                <Accordion.Item
                  key={index}
                  value={`faq-${index}`}
                  className="bg-card border border-border rounded-xl overflow-hidden transition-colors data-[state=open]:border-gold/30"
                >
                  <Accordion.Trigger className="w-full flex items-center justify-between px-6 py-5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40 rounded-xl">
                    <span className="font-display font-semibold text-sm text-white pr-4">
                      {item.question}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gold flex-shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                  <Accordion.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
                    <div className="px-6 pb-5">
                      <p className="text-sm text-muted leading-relaxed font-body">
                        {item.answer}
                      </p>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BOTTOM CTA                                                   */}
      {/* ============================================================ */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="bg-card border border-border rounded-2xl p-12 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Glow background */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(201,168,76,0.3) 0%, transparent 70%)',
              }}
            />
            <h3 className="relative font-display font-bold text-2xl text-white mb-3">
              Ready to transform your portfolio?
            </h3>
            <p className="relative text-muted mb-8 font-body">
              Start your 14-day free trial. No credit card required.
            </p>
            <motion.button
              onClick={() => handleCTAClick('pro')}
              className="relative inline-flex items-center px-8 py-3.5 rounded-xl bg-gold text-black font-display font-semibold text-sm tracking-wide hover:brightness-110 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              style={{ boxShadow: '0 0 30px rgba(201,168,76,0.25)' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started with Pro
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

/* ================================================================== */
/*  PAGE EXPORT (Suspense boundary for useSearchParams)                */
/* ================================================================== */

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PricingPageInner />
    </Suspense>
  )
}
