'use client'

import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Crown, Sparkles, Shield } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { PLANS, type PlanName, type FeatureKey } from '@/lib/stripe/plans'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Feature display names (for the comparison table)                   */
/* ------------------------------------------------------------------ */

const FEATURE_META: Record<FeatureKey, string> = {
  portfolioDashboard:   'Portfolio Dashboard',
  propertyLimit:        'Properties',
  dealAnalysis:         'Deal Analysis',
  dealAnalysisLimit:    'Deal Analyses / mo',
  dealPipeline:         'Deal Pipeline',
  dealPipelineLimit:    'Active Deals',
  tenantManagement:     'Tenant Management',
  tenantLimit:          'Tenants',
  basicDocuments:       'Basic Documents',
  mobileAccess:         'Mobile Access',
  heatMap:              'Heat Map Intelligence',
  tenantScreening:      'Tenant Screening',
  aiAssistant:          'AI Assistant',
  aiMessagesLimit:      'AI Messages / mo',
  marketIntelligence:   'Market Intelligence',
  liveMarketData:       'Live Market Data',
  timeAnalysis:         'Time Analysis',
  accounting:           'Accounting Suite',
  financingHub:         'Financing Hub',
  contractorNetwork:    'Contractor Network',
  fullDocumentVault:    'Full Document Vault',
  emailAgents:          'Email AI Agents',
  voiceAgents:          'Voice AI Agents',
  smsAgents:            'SMS AI Agents',
  autopilotMode:        'Autopilot Mode',
  syndicationTools:     'Syndication Tools',
  unlimitedProperties:  'Unlimited Properties',
  unlimitedDeals:       'Unlimited Deals',
  unlimitedAI:          'Unlimited AI',
  prioritySupport:      'Priority Support',
  dedicatedManager:     'Dedicated Manager',
  whiteLabel:           'White Label',
  zoneIntelligence:     'Zone Intelligence',
  insuranceAutomation:  'Insurance Automation',
  exitStrategyPlanner:  'Exit Strategy Planner',
  bulkPortfolioImport:  'Bulk Portfolio Import',
  aiDealRecommendation: 'AI Deal Recommendations',
  liveRentAutofill:     'Live Rent Autofill',
  portfolioBenchmarking:'Portfolio Benchmarking',
}

/* ------------------------------------------------------------------ */
/*  Top 8 comparison features shown in plan columns                    */
/* ------------------------------------------------------------------ */

const COMPARISON_FEATURES: FeatureKey[] = [
  'propertyLimit',
  'dealAnalysisLimit',
  'aiAssistant',
  'marketIntelligence',
  'heatMap',
  'tenantScreening',
  'emailAgents',
  'autopilotMode',
]

/* ------------------------------------------------------------------ */
/*  Feature label for the target feature heading                       */
/* ------------------------------------------------------------------ */

const FEATURE_DESCRIPTIONS: Partial<Record<FeatureKey, string>> = {
  heatMap:              'Interactive heat maps showing market trends, pricing, and demand zones.',
  tenantScreening:      'Comprehensive background checks and credit screening for applicants.',
  aiAssistant:          'Your personal AI advisor for real estate investment decisions.',
  marketIntelligence:   'Real-time market data, trends, and comparative analytics.',
  emailAgents:          'AI agents that draft, send, and manage emails on your behalf.',
  voiceAgents:          'AI-powered voice agents for automated phone calls and follow-ups.',
  smsAgents:            'Automated SMS outreach and response handling with AI.',
  autopilotMode:        'Fully autonomous portfolio management with AI decision-making.',
  accounting:           'Built-in accounting with income tracking, expenses, and tax reports.',
  financingHub:         'Compare loan options, track financing, and manage mortgages.',
  fullDocumentVault:    'Unlimited document storage with OCR, search, and auto-tagging.',
  syndicationTools:     'Tools for syndicating deals and managing investor relationships.',
  whiteLabel:           'Remove RKV branding and customize the platform as your own.',
  prioritySupport:      'Skip the queue with dedicated priority support channels.',
  dedicatedManager:     'A personal account manager to help optimize your workflow.',
  zoneIntelligence:     'Deep zoning data, overlay districts, and land-use analytics.',
  insuranceAutomation:  'Automated insurance tracking, renewals, and comparison shopping.',
  exitStrategyPlanner:  'Model exit scenarios with projected ROI and tax implications.',
  bulkPortfolioImport:  'Import entire portfolios from spreadsheets or other platforms.',
  aiDealRecommendation: 'Personalized deal recommendations based on your investment profile.',
  liveRentAutofill:     'Auto-populate rent estimates using live comparable data.',
  portfolioBenchmarking:'Benchmark your portfolio against market averages and top performers.',
  contractorNetwork:    'Access a vetted contractor network for maintenance and renovations.',
  liveMarketData:       'Live feeds from MLS, public records, and market indices.',
  timeAnalysis:         'Track time-on-market trends and optimal buying/selling windows.',
}

/* ------------------------------------------------------------------ */
/*  Plan column config                                                 */
/* ------------------------------------------------------------------ */

interface PlanColumnConfig {
  key: PlanName
  icon: React.ReactNode
  color: string             // text color for CTA
  bgColor: string           // bg color for CTA
  hoverShadow: string       // hover shadow
  borderClass: string       // border style for the column
  badgeText?: string        // "Current Plan" | "Recommended"
}

/* ------------------------------------------------------------------ */
/*  Stripe price IDs - these map to your Stripe dashboard              */
/* ------------------------------------------------------------------ */

const STRIPE_PRICE_IDS: Record<PlanName, string> = {
  basic: 'price_basic_monthly',
  pro: 'price_pro_monthly',
  elite: 'price_elite_monthly',
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  targetFeature?: FeatureKey
  targetPlan?: PlanName
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

const contentVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 28, stiffness: 320, delay: 0.05 },
  },
  exit: { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.2 } },
}

const columnVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
}

/* ------------------------------------------------------------------ */
/*  Feature value display helper                                       */
/* ------------------------------------------------------------------ */

function featureDisplay(plan: PlanName, feature: FeatureKey): React.ReactNode {
  const value = PLANS[plan].features[feature]

  if (typeof value === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 text-green" />
    ) : (
      <X className="h-4 w-4 text-muted/40" />
    )
  }

  // Numeric value
  if (value === Infinity) {
    return <span className="text-xs font-semibold text-gold">Unlimited</span>
  }
  if (value === 0) {
    return <X className="h-4 w-4 text-muted/40" />
  }
  return <span className="text-xs font-semibold text-white">{value.toLocaleString()}</span>
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function UpgradeModal({ isOpen, onClose, targetFeature, targetPlan }: UpgradeModalProps) {
  const { planName: currentPlanName } = useSubscription()

  const recommended = targetPlan ?? 'pro'

  /* ---- Plan column configurations ---- */
  const planConfigs: PlanColumnConfig[] = [
    {
      key: 'basic',
      icon: <Shield className="h-5 w-5" />,
      color: 'text-black',
      bgColor: 'bg-white/80 hover:bg-white',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]',
      borderClass: currentPlanName === 'basic' ? 'border-white/20' : 'border-border',
    },
    {
      key: 'pro',
      icon: <Crown className="h-5 w-5" />,
      color: 'text-black',
      bgColor: 'bg-gold hover:brightness-110',
      hoverShadow: 'hover:shadow-glow',
      borderClass:
        recommended === 'pro'
          ? 'border-gold/50 shadow-glow'
          : currentPlanName === 'pro'
            ? 'border-gold/30'
            : 'border-border',
    },
    {
      key: 'elite',
      icon: <Sparkles className="h-5 w-5" />,
      color: 'text-white',
      bgColor: 'bg-green hover:bg-green/90',
      hoverShadow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]',
      borderClass:
        recommended === 'elite'
          ? 'border-green/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]'
          : currentPlanName === 'elite'
            ? 'border-green/30'
            : 'border-border',
    },
  ]

  /* ---- Handle checkout ---- */
  const handleCheckout = useCallback(
    async (plan: PlanName) => {
      if (plan === currentPlanName) return

      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: STRIPE_PRICE_IDS[plan],
            planName: plan,
          }),
        })

        const data = await res.json()

        if (data.url) {
          window.location.href = data.url
        }
      } catch (err) {
        console.error('[UpgradeModal] Checkout error:', err)
      }
    },
    [currentPlanName],
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Content card */}
          <motion.div
            className={cn(
              'relative w-full max-w-4xl max-h-[90vh] overflow-y-auto',
              'bg-card border border-border rounded-2xl',
              'shadow-card',
            )}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className={cn(
                'absolute right-4 top-4 z-10 p-2 rounded-lg',
                'text-muted hover:text-white hover:bg-white/5',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40',
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                {targetFeature ? (
                  <>
                    <motion.div
                      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 border border-gold/20"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15, type: 'spring' as const, stiffness: 300, damping: 20 }}
                    >
                      <Crown className="h-5 w-5 text-gold" />
                    </motion.div>
                    <h2 className="font-display font-bold text-2xl text-white mb-2">
                      Unlock {FEATURE_META[targetFeature]}
                    </h2>
                    <p className="font-body text-sm text-muted max-w-lg mx-auto">
                      {FEATURE_DESCRIPTIONS[targetFeature] ??
                        'Upgrade your plan to access this premium feature and accelerate your real estate investments.'}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="font-display font-bold text-2xl text-white mb-2">
                      Choose Your Plan
                    </h2>
                    <p className="font-body text-sm text-muted max-w-lg mx-auto">
                      Scale your real estate portfolio with the right tools. Every plan includes a
                      14-day free trial.
                    </p>
                  </>
                )}
              </div>

              {/* Plan columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                {planConfigs.map((config, index) => {
                  const plan = PLANS[config.key]
                  const isCurrent = currentPlanName === config.key
                  const isRecommended = recommended === config.key && !isCurrent

                  return (
                    <motion.div
                      key={config.key}
                      className={cn(
                        'relative flex flex-col rounded-xl border p-6',
                        'bg-deep/50',
                        config.borderClass,
                        isRecommended && 'ring-1 ring-gold/20',
                      )}
                      custom={index}
                      variants={columnVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {/* Badge */}
                      {(isCurrent || isRecommended) && (
                        <div
                          className={cn(
                            'absolute -top-3 left-1/2 -translate-x-1/2',
                            'px-3 py-1 rounded-full text-[10px] font-display font-semibold uppercase tracking-wider',
                            isCurrent
                              ? 'bg-white/10 text-white border border-white/10'
                              : 'bg-gold text-black',
                          )}
                        >
                          {isCurrent ? 'Current Plan' : 'Recommended'}
                        </div>
                      )}

                      {/* Plan icon + name */}
                      <div className="flex items-center gap-2.5 mb-4 mt-1">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-lg',
                            config.key === 'basic' && 'bg-white/5 text-white',
                            config.key === 'pro' && 'bg-gold/10 text-gold',
                            config.key === 'elite' && 'bg-green/10 text-green',
                          )}
                        >
                          {config.icon}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-white text-base">
                            {plan.name}
                          </h3>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <span className="font-display font-bold text-3xl text-white">
                          ${plan.price}
                        </span>
                        <span className="text-muted text-sm font-body">/mo</span>
                      </div>

                      {/* Feature list */}
                      <div className="flex-1 space-y-3 mb-6">
                        {COMPARISON_FEATURES.map((featureKey) => (
                          <div
                            key={featureKey}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="font-body text-xs text-text truncate">
                              {FEATURE_META[featureKey]}
                            </span>
                            <span className="shrink-0 flex items-center">
                              {featureDisplay(config.key, featureKey)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* CTA button */}
                      <motion.button
                        onClick={() => handleCheckout(config.key)}
                        disabled={isCurrent}
                        className={cn(
                          'w-full h-11 rounded-lg font-display font-semibold text-sm',
                          'transition-all duration-200 ease-out',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                          isCurrent
                            ? 'bg-white/5 text-muted cursor-default border border-border'
                            : cn(config.bgColor, config.color, config.hoverShadow),
                        )}
                        whileHover={isCurrent ? {} : { scale: 1.02 }}
                        whileTap={isCurrent ? {} : { scale: 0.98 }}
                      >
                        {isCurrent ? 'Current Plan' : `Get ${plan.name}`}
                      </motion.button>
                    </motion.div>
                  )
                })}
              </div>

              {/* Trial callout */}
              <motion.p
                className="text-center font-body text-xs text-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                All plans include a{' '}
                <span className="text-gold font-semibold">14-day free trial</span>. Cancel
                anytime, no questions asked.
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default UpgradeModal
