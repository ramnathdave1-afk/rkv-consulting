'use client'

import React, { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { PLANS, type PlanName, type FeatureKey } from '@/lib/stripe/plans'
import { cn } from '@/lib/utils'
import { UpgradeModal } from '@/components/paywall/UpgradeModal'

/* ------------------------------------------------------------------ */
/*  Feature display names + descriptions                               */
/* ------------------------------------------------------------------ */

const FEATURE_META: Record<FeatureKey, { label: string; description: string }> = {
  portfolioDashboard:   { label: 'Portfolio Dashboard',      description: 'Full portfolio overview with analytics and performance tracking.' },
  propertyLimit:        { label: 'More Properties',          description: 'Manage more properties in your portfolio with expanded limits.' },
  dealAnalysis:         { label: 'Deal Analysis',            description: 'AI-powered deal analysis to evaluate investment opportunities.' },
  dealAnalysisLimit:    { label: 'More Deal Analyses',       description: 'Run more deal analyses per month for deeper market coverage.' },
  dealPipeline:         { label: 'Deal Pipeline',            description: 'Visual pipeline to track deals from discovery to close.' },
  dealPipelineLimit:    { label: 'Larger Deal Pipeline',     description: 'Track more active deals simultaneously in your pipeline.' },
  tenantManagement:     { label: 'Tenant Management',        description: 'Complete tenant management with communication and tracking.' },
  tenantLimit:          { label: 'More Tenants',             description: 'Manage more tenants across your portfolio.' },
  basicDocuments:       { label: 'Documents',                description: 'Store and organize your real estate documents securely.' },
  mobileAccess:         { label: 'Mobile Access',            description: 'Access your portfolio on-the-go from any device.' },
  heatMap:              { label: 'Heat Map Intelligence',    description: 'Interactive heat maps showing market trends, pricing, and demand zones.' },
  tenantScreening:      { label: 'Tenant Screening',         description: 'Comprehensive background checks and credit screening for applicants.' },
  aiAssistant:          { label: 'AI Assistant',             description: 'Your personal AI advisor for real estate investment decisions.' },
  aiMessagesLimit:      { label: 'AI Messages',             description: 'Send more messages to your AI assistant each month.' },
  marketIntelligence:   { label: 'Market Intelligence',      description: 'Real-time market data, trends, and comparative analytics.' },
  liveMarketData:       { label: 'Live Market Data',         description: 'Live feeds from MLS, public records, and market indices.' },
  timeAnalysis:         { label: 'Time Analysis',            description: 'Track time-on-market trends and optimal buying/selling windows.' },
  accounting:           { label: 'Accounting',               description: 'Built-in accounting with income tracking, expenses, and tax reports.' },
  financingHub:         { label: 'Financing Hub',            description: 'Compare loan options, track financing, and manage mortgages.' },
  contractorNetwork:    { label: 'Contractor Network',       description: 'Access a vetted contractor network for maintenance and renovations.' },
  fullDocumentVault:    { label: 'Full Document Vault',      description: 'Unlimited document storage with OCR, search, and auto-tagging.' },
  emailAgents:          { label: 'Email AI Agents',          description: 'AI agents that draft, send, and manage emails on your behalf.' },
  voiceAgents:          { label: 'Voice AI Agents',          description: 'AI-powered voice agents for automated phone calls and follow-ups.' },
  smsAgents:            { label: 'SMS AI Agents',            description: 'Automated SMS outreach and response handling with AI.' },
  autopilotMode:        { label: 'Autopilot Mode',           description: 'Fully autonomous portfolio management with AI decision-making.' },
  syndicationTools:     { label: 'Syndication Tools',        description: 'Tools for syndicating deals and managing investor relationships.' },
  unlimitedProperties:  { label: 'Unlimited Properties',     description: 'No limits on the number of properties in your portfolio.' },
  unlimitedDeals:       { label: 'Unlimited Deals',          description: 'No limits on active deals in your pipeline.' },
  unlimitedAI:          { label: 'Unlimited AI',             description: 'Unlimited access to all AI features with no message caps.' },
  prioritySupport:      { label: 'Priority Support',         description: 'Skip the queue with dedicated priority support channels.' },
  dedicatedManager:     { label: 'Dedicated Account Manager', description: 'A personal account manager to help optimize your workflow.' },
  whiteLabel:           { label: 'White Label',              description: 'Remove RKV branding and customize the platform as your own.' },
  zoneIntelligence:     { label: 'Zone Intelligence',        description: 'Deep zoning data, overlay districts, and land-use analytics.' },
  insuranceAutomation:  { label: 'Insurance Automation',     description: 'Automated insurance tracking, renewals, and comparison shopping.' },
  exitStrategyPlanner:  { label: 'Exit Strategy Planner',    description: 'Model exit scenarios with projected ROI and tax implications.' },
  bulkPortfolioImport:  { label: 'Bulk Portfolio Import',    description: 'Import entire portfolios from spreadsheets or other platforms.' },
  aiDealRecommendation: { label: 'AI Deal Recommendations',  description: 'Personalized deal recommendations based on your investment profile.' },
  liveRentAutofill:     { label: 'Live Rent Autofill',       description: 'Auto-populate rent estimates using live comparable data.' },
  portfolioBenchmarking:{ label: 'Portfolio Benchmarking',    description: 'Benchmark your portfolio against market averages and top performers.' },
}

/* ------------------------------------------------------------------ */
/*  Helper: find the cheapest plan that unlocks a feature              */
/* ------------------------------------------------------------------ */

function findUnlockingPlan(featureKey: FeatureKey): { name: PlanName; plan: (typeof PLANS)[PlanName] } {
  const order: PlanName[] = ['basic', 'pro', 'elite']
  for (const key of order) {
    const value = PLANS[key].features[featureKey]
    const enabled = typeof value === 'boolean' ? value : value > 0
    if (enabled) return { name: key, plan: PLANS[key] }
  }
  return { name: 'elite', plan: PLANS.elite }
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FeatureGateProps {
  feature: FeatureKey
  children: ReactNode
  fallback?: ReactNode
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading } = useSubscription()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // While loading, show children to avoid layout flash
  if (isLoading) {
    return <>{children}</>
  }

  // User has the feature -- render normally
  if (hasFeature(feature)) {
    return <>{children}</>
  }

  // Feature is locked -- render premium overlay
  const meta = FEATURE_META[feature]
  const unlocking = findUnlockingPlan(feature)

  return (
    <>
      <div className="relative">
        {/* Blurred content or fallback */}
        <div
          className="pointer-events-none select-none"
          aria-hidden="true"
        >
          <div className="blur-[6px] opacity-40">
            {fallback ?? children ?? (
              <div className="h-64 w-full rounded-xl bg-card/50" />
            )}
          </div>
        </div>

        {/* Premium locked overlay */}
        <AnimatePresence>
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div
              className={cn(
                'relative w-full max-w-md mx-auto',
                'bg-card border border-gold/30 rounded-xl',
                'p-8 text-center',
                'shadow-glow-lg',
              )}
            >
              {/* Subtle gold glow behind the card */}
              <div
                className="absolute -inset-px rounded-xl opacity-20 blur-md pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(201,168,76,0.25) 0%, transparent 70%)',
                }}
              />

              {/* Lock icon */}
              <motion.div
                className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 border border-gold/20"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' as const, stiffness: 300, damping: 20 }}
              >
                <Lock className="h-6 w-6 text-gold" />
              </motion.div>

              {/* Title */}
              <h3 className="relative font-display font-bold text-lg text-white mb-2">
                Unlock {meta.label}
              </h3>

              {/* Description */}
              <p className="relative font-body text-sm text-muted mb-4 leading-relaxed">
                {meta.description}
              </p>

              {/* Plan badge */}
              <p className="relative font-body text-xs text-gold/80 mb-6">
                Available on the{' '}
                <span className="font-semibold text-gold">{unlocking.plan.name}</span>{' '}
                plan &mdash; ${unlocking.plan.price}/mo
              </p>

              {/* Upgrade button */}
              <motion.button
                onClick={() => setUpgradeOpen(true)}
                className={cn(
                  'relative inline-flex items-center justify-center',
                  'h-11 px-8 rounded-lg',
                  'bg-gold text-black font-display font-semibold text-sm',
                  'hover:shadow-glow hover:brightness-110',
                  'active:brightness-95',
                  'transition-all duration-200 ease-out',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                )}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Upgrade to {unlocking.plan.name}
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Upgrade modal */}
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        targetFeature={feature}
        targetPlan={unlocking.name}
      />
    </>
  )
}

export default FeatureGate
