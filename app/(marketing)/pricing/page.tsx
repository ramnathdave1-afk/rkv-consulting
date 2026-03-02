'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PricingTable } from '@/components/ui/pricing-table'
import type { PricingFeature, PricingPlan } from '@/components/ui/pricing-table'

/* ================================================================== */
/*  PRICING TABLE DATA                                                  */
/* ================================================================== */

const pricingPlans: PricingPlan[] = [
  {
    name: 'Basic',
    price: { monthly: 20, yearly: 192 },
    level: 'basic',
  },
  {
    name: 'Pro',
    price: { monthly: 99, yearly: 950 },
    level: 'pro',
    popular: true,
  },
  {
    name: 'Elite',
    price: { monthly: 199, yearly: 1910 },
    level: 'elite',
  },
]

const pricingFeatures: PricingFeature[] = [
  // Core
  { name: 'Portfolio Dashboard', included: 'basic' },
  { name: 'Deal Pipeline', included: 'basic' },
  { name: 'Document Storage', included: 'basic' },
  { name: 'Mobile Access', included: 'basic' },
  // Pro
  { name: 'AI Assistant (200 msgs/mo)', included: 'pro' },
  { name: 'Live Market Intelligence', included: 'pro' },
  { name: 'Heat Map & Zoning Intel', included: 'pro' },
  { name: 'Tenant Screening', included: 'pro' },
  { name: 'Accounting & Tax Center', included: 'pro' },
  { name: 'Financing Hub', included: 'pro' },
  { name: 'Contractor Network', included: 'pro' },
  { name: 'Deal Feed with AI Scoring', included: 'pro' },
  { name: 'Exit Strategy Planner', included: 'pro' },
  // Elite
  { name: 'Unlimited Properties & Deals', included: 'elite' },
  { name: 'Unlimited AI Messages', included: 'elite' },
  { name: 'AI Voice Agent', included: 'elite' },
  { name: 'AI Email Automation', included: 'elite' },
  { name: 'AI SMS Agent', included: 'elite' },
  { name: 'Autopilot Mode', included: 'elite' },
  { name: 'Syndication & Investor Reporting', included: 'elite' },
  { name: 'Priority Support & Dedicated Manager', included: 'elite' },
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
/*  STRIPE PRICE IDS                                                   */
/* ================================================================== */

const STRIPE_PRICES: Record<string, Record<string, string>> = {
  basic: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_monthly',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL || 'price_basic_annual',
  },
  pro: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
  },
  elite: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE_MONTHLY || 'price_elite_monthly',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE_ANNUAL || 'price_elite_annual',
  },
}

/* ================================================================== */
/*  ROI CALCULATOR                                                     */
/* ================================================================== */

function ROICalculator() {
  const [numProperties, setNumProperties] = useState(5)

  const hoursPerPropertyPerMonth = 8
  const hourlyRate = 50
  const toolCostPerProperty = 15
  const accountantCostPerYear = 800
  const missedMaintenanceCost = 1200

  const timeSavedHours = numProperties * hoursPerPropertyPerMonth * 0.6
  const timeSavedDollars = timeSavedHours * hourlyRate * 12
  const toolSavings = numProperties * toolCostPerProperty * 12
  const accountingSavings = numProperties * (accountantCostPerYear * 0.3)
  const maintenanceSavings = numProperties * (missedMaintenanceCost * 0.4)
  const totalAnnualSavings = timeSavedDollars + toolSavings + accountingSavings + maintenanceSavings

  const rkvCost = numProperties <= 5 ? 49 * 12 : numProperties <= 50 ? 99 * 12 : 199 * 12
  const netSavings = totalAnnualSavings - rkvCost
  const roi = rkvCost > 0 ? Math.round((netSavings / rkvCost) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-white font-body">Number of Properties</label>
          <span className="text-2xl font-bold text-gold font-mono">{numProperties}</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={numProperties}
          onChange={(e) => setNumProperties(parseInt(e.target.value))}
          className="w-full h-2 bg-[#1e1e1e] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-lg"
        />
        <div className="flex justify-between text-[10px] text-muted font-body mt-1">
          <span>1</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Time Saved', value: `$${timeSavedDollars.toLocaleString()}`, sub: `${Math.round(timeSavedHours * 12)} hrs/year` },
          { label: 'Tool Consolidation', value: `$${toolSavings.toLocaleString()}`, sub: 'vs. multiple tools' },
          { label: 'Accounting Savings', value: `$${Math.round(accountingSavings).toLocaleString()}`, sub: 'Schedule E automation' },
          { label: 'Maintenance Prevention', value: `$${Math.round(maintenanceSavings).toLocaleString()}`, sub: 'proactive scheduling' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg p-4" style={{ background: '#080808', border: '1px solid #1e1e1e' }}>
            <p className="text-[10px] text-muted uppercase tracking-wider font-body mb-1">{item.label}</p>
            <p className="text-lg font-bold text-green font-mono">{item.value}</p>
            <p className="text-[10px] text-muted font-body mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-[#1e1e1e] pt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider font-body mb-1">Total Annual Savings</p>
            <p className="text-2xl font-bold text-green font-mono">${totalAnnualSavings.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider font-body mb-1">RKV Annual Cost</p>
            <p className="text-2xl font-bold text-white font-mono">${rkvCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-wider font-body mb-1">Net ROI</p>
            <p className="text-2xl font-bold text-gold font-mono">{roi}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  INNER COMPONENT (uses useSearchParams)                             */
/* ================================================================== */

function PricingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Checkout logic                                                    */
  /* ---------------------------------------------------------------- */

  const triggerCheckout = useCallback(
    async (planId: string, interval: string) => {
      setLoadingPlan(planId)
      try {
        const priceId = STRIPE_PRICES[planId]?.[interval]
        if (!priceId) return
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, planName: planId }),
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
      triggerCheckout(plan, 'monthly')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleCheckout = async (planLevel: string, interval: 'monthly' | 'yearly') => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      router.push(`/signup?plan=${planLevel}`)
      return
    }

    triggerCheckout(planLevel, interval)
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-[#080808] font-body">
      {/* ============================================================ */}
      {/*  HERO SECTION WITH ANIMATED GRADIENT                          */}
      {/* ============================================================ */}
      <section className="pt-24 pb-16 px-6 relative overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.p
            className="text-[10px] font-mono uppercase tracking-wider text-gold mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            RKV Consulting
          </motion.p>

          <motion.h1
            className="font-display font-bold text-4xl md:text-5xl text-white leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Simple, Transparent Pricing.
          </motion.h1>

          <motion.p
            className="text-muted text-lg mt-4 max-w-xl mx-auto font-body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Choose the plan that matches your ambition. Upgrade or cancel anytime.
          </motion.p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  PRICING TABLE                                                */}
      {/* ============================================================ */}
      <section className="pb-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <PricingTable
            features={pricingFeatures}
            plans={pricingPlans}
            defaultPlan="pro"
            defaultInterval="monthly"
            onPlanSelect={(plan) => console.log('Selected:', plan)}
            isLoading={!!loadingPlan}
            onCheckout={(plan, interval) => handleCheckout(plan, interval)}
          />
        </motion.div>
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
      {/*  ROI CALCULATOR                                                */}
      {/* ============================================================ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-display font-bold text-white mb-3">
              Calculate Your Savings
            </h2>
            <p className="text-muted font-body">
              See how much RKV saves you compared to managing properties manually or with multiple tools.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card border border-border rounded-2xl p-8"
          >
            <ROICalculator />
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BOTTOM CTA                                                   */}
      {/* ============================================================ */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="relative rounded-2xl p-12 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-card/80" />
            <div className="absolute inset-0 border border-border rounded-2xl" />

            <h3 className="relative font-display font-bold text-2xl text-white mb-3">
              Ready to transform your portfolio?
            </h3>
            <p className="relative text-muted mb-8 font-body">
              Start your 14-day free trial. No credit card required.
            </p>
            <motion.button
              onClick={() => handleCheckout('pro', 'monthly')}
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
        <div className="min-h-screen bg-[#080808] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PricingPageInner />
    </Suspense>
  )
}
