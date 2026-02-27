'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 5;

const investorTypes = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Just getting started',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: '1-5 years experience',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    value: 'experienced',
    label: 'Experienced',
    description: '5+ years, scaling up',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
];

const portfolioSizes = [
  { value: '0', label: '0 properties' },
  { value: '1-5', label: '1-5 properties' },
  { value: '6-20', label: '6-20 properties' },
  { value: '20+', label: '20+ properties' },
];

const strategies = [
  { value: 'buy_hold', label: 'Buy & Hold' },
  { value: 'fix_flip', label: 'Fix & Flip' },
  { value: 'brrrr', label: 'BRRRR' },
  { value: 'short_term_rental', label: 'Short Term Rental' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'mixed', label: 'Mixed' },
];

const planFeatures: Record<string, string[]> = {
  basic: [
    'Deal Analyzer (5/month)',
    'Property Management (up to 5)',
    'Tenant Screening (basic)',
    'Market Intelligence',
    'AI Assistant (50 queries/month)',
  ],
  pro: [
    'Deal Analyzer (unlimited)',
    'Property Management (up to 50)',
    'Tenant Screening (advanced)',
    'Market Intelligence + Alerts',
    'AI Assistant (500 queries/month)',
    'Portfolio Analytics',
    'Email Campaigns',
    'SMS Messaging',
  ],
  elite: [
    'Everything in Pro',
    'Unlimited Properties',
    'Unlimited AI Queries',
    'Priority Support',
    'API Access',
    'Custom Branding',
    'White Label Reports',
  ],
};

/* ------------------------------------------------------------------ */
/*  Animated Checkmark SVG                                             */
/* ------------------------------------------------------------------ */

function AnimatedCheckmark() {
  return (
    <svg className="w-16 h-16" viewBox="0 0 52 52">
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="#059669"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.path
        fill="none"
        stroke="#059669"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 27l7.8 7.8L38 17"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Selection Card Component                                           */
/* ------------------------------------------------------------------ */

function SelectionCard({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border-2 p-4 transition-all duration-200
        ${
          selected
            ? 'border-gold bg-gold/5 shadow-glow-sm'
            : 'border-border bg-card hover:border-gold/30 hover:bg-card/80'
        }
        ${className || ''}
      `}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarding Page                                                    */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  // ---- Step state ----
  const [currentStep, setCurrentStep] = useState(1);

  // ---- Step 1 ----
  const [plan, setPlan] = useState('pro'); // default from signup flow

  // ---- Step 2 ----
  const [investorType, setInvestorType] = useState('');
  const [portfolioSize, setPortfolioSize] = useState('');
  const [primaryStrategy, setPrimaryStrategy] = useState('');

  // ---- Step 3 ----
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');

  // ---- Step 4 ----
  const [selectedConnection, setSelectedConnection] = useState('');

  // ---- Confetti ----
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentStep === 5) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // ---- Fetch user plan on mount ----
  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .single();

      if (sub?.plan) {
        setPlan(sub.plan);
      }
    }
    fetchPlan();
  }, [supabase, router]);

  // ---- Save onboarding data ----
  const saveOnboardingData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        investor_type: investorType || null,
        primary_strategy: primaryStrategy || null,
        portfolio_size_range: portfolioSize || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  }, [supabase, investorType, primaryStrategy, portfolioSize]);

  // ---- Navigation ----
  const handleNext = async () => {
    if (currentStep === 4) {
      // Save profile before going to final step
      await saveOnboardingData();
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  // ---- Progress bar ----
  const ProgressBar = () => (
    <div className="flex gap-2 mb-10">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const stepNum = i + 1;
        const isFilled = stepNum <= currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <div
            key={i}
            className={`
              h-1.5 flex-1 rounded-full transition-all duration-500
              ${isFilled ? 'bg-gold' : 'bg-border'}
              ${isCurrent ? 'animate-pulse' : ''}
            `}
          />
        );
      })}
    </div>
  );

  // ---- Render steps ----
  const renderStep = () => {
    switch (currentStep) {
      /* ------------------------------------------------------------ */
      /*  Step 1 - Welcome                                             */
      /* ------------------------------------------------------------ */
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <AnimatedCheckmark />
            <h2 className="font-display font-bold text-3xl text-white mt-6">
              Welcome to RKV Consulting
            </h2>
            <p className="text-muted mt-2 font-body">
              Your <span className="text-gold font-medium capitalize">{plan}</span> plan is active.
              Here&apos;s what you unlocked:
            </p>
            <div className="mt-8 w-full max-w-sm text-left">
              <ul className="space-y-3">
                {(planFeatures[plan] || planFeatures.pro).map((feature, i) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-center gap-3 text-sm font-body"
                  >
                    <svg
                      className="w-4 h-4 text-gold shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-white/80">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        );

      /* ------------------------------------------------------------ */
      /*  Step 2 - Tell us about you                                   */
      /* ------------------------------------------------------------ */
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="font-display font-bold text-3xl text-white">
              Tell us about you
            </h2>
            <p className="text-muted mt-2 font-body">
              This helps us personalize your experience.
            </p>

            {/* Investor Type */}
            <div className="mt-8">
              <p className="text-sm text-muted font-body mb-3">Investor Type</p>
              <div className="grid grid-cols-3 gap-3">
                {investorTypes.map((type) => (
                  <SelectionCard
                    key={type.value}
                    selected={investorType === type.value}
                    onClick={() => setInvestorType(type.value)}
                  >
                    <div className={`mb-2 ${investorType === type.value ? 'text-gold' : 'text-muted'}`}>
                      {type.icon}
                    </div>
                    <p className="text-sm font-medium text-white font-body">{type.label}</p>
                    <p className="text-xs text-muted font-body mt-0.5">{type.description}</p>
                  </SelectionCard>
                ))}
              </div>
            </div>

            {/* Portfolio Size */}
            <div className="mt-6">
              <p className="text-sm text-muted font-body mb-3">Portfolio Size</p>
              <div className="grid grid-cols-4 gap-3">
                {portfolioSizes.map((size) => (
                  <SelectionCard
                    key={size.value}
                    selected={portfolioSize === size.value}
                    onClick={() => setPortfolioSize(size.value)}
                  >
                    <p className="text-sm font-medium text-white font-body text-center">
                      {size.label}
                    </p>
                  </SelectionCard>
                ))}
              </div>
            </div>

            {/* Primary Strategy */}
            <div className="mt-6">
              <p className="text-sm text-muted font-body mb-3">Primary Strategy</p>
              <div className="grid grid-cols-3 gap-3">
                {strategies.map((s) => (
                  <SelectionCard
                    key={s.value}
                    selected={primaryStrategy === s.value}
                    onClick={() => setPrimaryStrategy(s.value)}
                  >
                    <p className="text-sm font-medium text-white font-body text-center">
                      {s.label}
                    </p>
                  </SelectionCard>
                ))}
              </div>
            </div>
          </motion.div>
        );

      /* ------------------------------------------------------------ */
      /*  Step 3 - Add your first property                             */
      /* ------------------------------------------------------------ */
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="font-display font-bold text-3xl text-white">
              Add your first property
            </h2>
            <p className="text-muted mt-2 font-body">
              Optional &mdash; you can always add properties later.
            </p>

            <div className="mt-8 space-y-4">
              <Input
                label="Property Address"
                placeholder="123 Main St, City, State ZIP"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
              />

              <Select
                label="Property Type"
                placeholder="Select type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                options={[
                  { value: 'single_family', label: 'Single Family' },
                  { value: 'multi_family', label: 'Multi Family' },
                  { value: 'condo', label: 'Condo' },
                  { value: 'townhouse', label: 'Townhouse' },
                  { value: 'commercial', label: 'Commercial' },
                  { value: 'land', label: 'Land' },
                  { value: 'mixed_use', label: 'Mixed Use' },
                ]}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Purchase Price"
                  type="number"
                  placeholder="$250,000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
                <Input
                  label="Current Value"
                  type="number"
                  placeholder="$300,000"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>

              <Input
                label="Monthly Rent"
                type="number"
                placeholder="$2,000"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
              />
            </div>
          </motion.div>
        );

      /* ------------------------------------------------------------ */
      /*  Step 4 - Connect your data                                   */
      /* ------------------------------------------------------------ */
      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="font-display font-bold text-3xl text-white">
              Connect your data
            </h2>
            <p className="text-muted mt-2 font-body">
              Sync your financial data for automated tracking.
            </p>

            <div className="mt-8 space-y-4">
              {/* Connect Bank */}
              <SelectionCard
                selected={selectedConnection === 'plaid'}
                onClick={() => setSelectedConnection('plaid')}
                className="flex items-start gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${selectedConnection === 'plaid' ? 'bg-gold/10' : 'bg-deep'}`}>
                    <svg className={`w-6 h-6 ${selectedConnection === 'plaid' ? 'text-gold' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium font-body">Connect Bank (Plaid)</p>
                    <p className="text-muted text-sm font-body mt-1">
                      Automatically import transactions from your bank accounts for real-time expense tracking.
                    </p>
                  </div>
                </div>
              </SelectionCard>

              {/* Import CSV */}
              <SelectionCard
                selected={selectedConnection === 'csv'}
                onClick={() => setSelectedConnection('csv')}
                className="flex items-start gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${selectedConnection === 'csv' ? 'bg-gold/10' : 'bg-deep'}`}>
                    <svg className={`w-6 h-6 ${selectedConnection === 'csv' ? 'text-gold' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium font-body">Import CSV</p>
                    <p className="text-muted text-sm font-body mt-1">
                      Upload a spreadsheet of your properties, tenants, or financial records.
                    </p>
                  </div>
                </div>
              </SelectionCard>

              {/* Skip */}
              <SelectionCard
                selected={selectedConnection === 'skip'}
                onClick={() => setSelectedConnection('skip')}
                className="flex items-start gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${selectedConnection === 'skip' ? 'bg-gold/10' : 'bg-deep'}`}>
                    <svg className={`w-6 h-6 ${selectedConnection === 'skip' ? 'text-gold' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.69z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium font-body">Skip for now</p>
                    <p className="text-muted text-sm font-body mt-1">
                      You can connect your data anytime from the settings page.
                    </p>
                  </div>
                </div>
              </SelectionCard>
            </div>
          </motion.div>
        );

      /* ------------------------------------------------------------ */
      /*  Step 5 - You're ready!                                       */
      /* ------------------------------------------------------------ */
      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
            </div>

            <h2 className="font-display font-bold text-3xl text-white">
              You&apos;re ready!
            </h2>
            <p className="text-muted mt-3 font-body max-w-sm">
              Your account is fully set up. Jump into your dashboard to start analyzing deals, managing properties, and growing your portfolio.
            </p>

            {/* Setup summary */}
            <div className="mt-8 w-full max-w-sm bg-card border border-border rounded-xl p-5 text-left">
              <p className="text-xs text-muted uppercase tracking-wider font-body mb-3">
                Your Setup
              </p>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted">Plan</span>
                  <span className="text-gold capitalize font-medium">{plan}</span>
                </div>
                {investorType && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted">Experience</span>
                    <span className="text-white capitalize">{investorType}</span>
                  </div>
                )}
                {portfolioSize && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted">Portfolio</span>
                    <span className="text-white">{portfolioSize} properties</span>
                  </div>
                )}
                {primaryStrategy && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted">Strategy</span>
                    <span className="text-white capitalize">
                      {strategies.find((s) => s.value === primaryStrategy)?.label || primaryStrategy}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              size="lg"
              fullWidth
              className="mt-8 max-w-sm"
              onClick={handleFinish}
            >
              Enter Dashboard
            </Button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Confetti */}
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.12}
          colors={['#059669', '#0EA5E9', '#059669', '#6366F1', '#E2E8F0']}
        />
      )}

      {/* Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        {/* Progress bar */}
        <div className="w-full">
          <ProgressBar />
        </div>

        {/* Step indicator */}
        <p className="text-xs text-muted font-body mb-6 self-start">
          Step {currentStep} of {TOTAL_STEPS}
        </p>

        {/* Step content */}
        <div className="w-full flex-1">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        {currentStep < 5 && (
          <div className="w-full flex items-center justify-between mt-10 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>

            <div className="flex gap-3">
              {currentStep === 3 && (
                <Button
                  variant="ghost"
                  onClick={handleNext}
                >
                  Skip
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep === 4 ? 'Finish Setup' : 'Continue'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
