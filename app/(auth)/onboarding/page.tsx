'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const ReactConfetti = dynamic(() => import('react-confetti'), { ssr: false });
import { createClient } from '@/lib/supabase/client';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import AddressAutocomplete, { type AddressData } from '@/components/ui/AddressAutocomplete';
import {
  User,
  Zap,
  Check,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Sparkles,
  Building2,
  CalendarDays,
  TrendingUp,
  FileText,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 5;

const PROPERTY_TYPE_OPTIONS = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
  { value: 'mixed_use', label: 'Mixed Use' },
];

const AUTOMATION_CARDS = [
  {
    id: 'rent_collection',
    label: 'Rent Collection Autopilot',
    description: 'Automatically sends reminders and follows up on late payments.',
    icon: <Mail className="w-5 h-5" />,
  },
  {
    id: 'lease_renewal',
    label: 'Lease Renewal Automation',
    description: 'Sends renewal notices 90/60/30 days before expiry.',
    icon: <CalendarDays className="w-5 h-5" />,
  },
  {
    id: 'maintenance_response',
    label: 'Maintenance Response',
    description: 'Acknowledges requests and keeps tenants updated automatically.',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: 'new_tenant_welcome',
    label: 'New Tenant Welcome',
    description: 'Sends a welcome sequence and move-in checklist automatically.',
    icon: <Sparkles className="w-5 h-5" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Animated Checkmark SVG                                             */
/* ------------------------------------------------------------------ */

function AnimatedCheckmark() {
  return (
    <svg className="w-16 h-16" viewBox="0 0 52 52">
      <motion.circle
        cx="26" cy="26" r="24"
        fill="none" stroke="#c9a84c" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.path
        fill="none" stroke="#c9a84c" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        d="M14 27l7.8 7.8L38 17"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarding Page                                                    */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 — Welcome
  const [plan, setPlan] = useState('pro');
  const [fullName, setFullName] = useState<string | null>(null);

  // Step 2 — Add Property
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyAddressData, setPropertyAddressData] = useState<AddressData | null>(null);
  const [propertyType, setPropertyType] = useState('single_family');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillSource, setAutofillSource] = useState<{ attom: boolean; rentcast: boolean }>({
    attom: false,
    rentcast: false,
  });
  const [flashFields, setFlashFields] = useState<{ purchasePrice: boolean; monthlyRent: boolean }>({
    purchasePrice: false,
    monthlyRent: false,
  });

  // Step 3 — Add Tenant
  const [tenantFirst, setTenantFirst] = useState('');
  const [tenantLast, setTenantLast] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantRent, setTenantRent] = useState('');

  // Step 4 — Automations
  const [enabledAutomations, setEnabledAutomations] = useState<Set<string>>(
    new Set(AUTOMATION_CARDS.map((a) => a.id))
  );

  // Confetti
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);

  // Saving states
  const [savingProperty, setSavingProperty] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
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

  // Fetch user plan
  useEffect(() => {
    async function fetchPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .single();
      if (sub?.plan) setPlan(sub.plan);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile?.full_name) setFullName(profile.full_name);
    }
    fetchPlan();
  }, [supabase, router]);

  // Address autocomplete is handled by <AddressAutocomplete />

  // Save property
  const saveProperty = useCallback(async () => {
    if (!propertyAddress.trim()) return;
    setSavingProperty(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Parse address parts
      const parts = propertyAddress.split(',').map((s) => s.trim());
      const street = parts[0] || propertyAddress;
      const city = parts[1] || '';
      const stateZip = parts[2] || '';
      const state = stateZip.split(' ')[0] || '';
      const zip = stateZip.split(' ')[1] || '';

      const { data } = await supabase.from('properties').insert({
        user_id: user.id,
        address: street,
        city,
        state,
        zip,
        property_type: propertyType,
        purchase_price: purchasePrice ? parseFloat(purchasePrice.replace(/,/g, '')) : null,
        monthly_rent: monthlyRent ? parseFloat(monthlyRent.replace(/,/g, '')) : null,
        status: 'active',
      }).select('id').single();

      if (data?.id) setCreatedPropertyId(data.id);
    } catch (err) {
      console.error('[Onboarding] Save property error:', err);
    }
    setSavingProperty(false);
  }, [supabase, propertyAddress, propertyType, purchasePrice, monthlyRent]);

  // Autofill property details after address select
  useEffect(() => {
    const address = propertyAddressData?.fullAddress;
    if (!address) return;
    let cancelled = false;

    async function run() {
      setAutofillLoading(true);
      setAutofillSource({ attom: false, rentcast: false });
      try {
        const res = await fetch('/api/property/autofill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Autofill failed');
        if (cancelled) return;

        const attomValue = data?.attom?.estimatedValue as number | null;
        const rentValue = data?.rentcast?.estimatedRent as number | null;

        if (typeof attomValue === 'number' && attomValue > 0) {
          setPurchasePrice(attomValue.toLocaleString());
          setFlashFields((p) => ({ ...p, purchasePrice: true }));
          setTimeout(() => setFlashFields((p) => ({ ...p, purchasePrice: false })), 450);
          setAutofillSource((p) => ({ ...p, attom: true }));
        }

        if (typeof rentValue === 'number' && rentValue > 0) {
          setMonthlyRent(rentValue.toLocaleString());
          setFlashFields((p) => ({ ...p, monthlyRent: true }));
          setTimeout(() => setFlashFields((p) => ({ ...p, monthlyRent: false })), 450);
          setAutofillSource((p) => ({ ...p, rentcast: true }));
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[Onboarding] Autofill failed', e);
      } finally {
        if (!cancelled) setAutofillLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [propertyAddressData]);

  // Save tenant
  const saveTenant = useCallback(async () => {
    if (!tenantFirst.trim() || !tenantLast.trim()) return;
    setSavingTenant(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the property we just created, or the first property
      let propId = createdPropertyId;
      if (!propId) {
        const { data: props } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        propId = props?.id || null;
      }

      if (!propId) {
        console.warn('[Onboarding] No property to assign tenant to');
        setSavingTenant(false);
        return;
      }

      await supabase.from('tenants').insert({
        user_id: user.id,
        property_id: propId,
        first_name: tenantFirst,
        last_name: tenantLast,
        email: tenantEmail || null,
        phone: tenantPhone || null,
        monthly_rent: tenantRent ? parseFloat(tenantRent.replace(/,/g, '')) : 0,
        status: 'active',
        screening_status: 'not_started',
      });
    } catch (err) {
      console.error('[Onboarding] Save tenant error:', err);
    }
    setSavingTenant(false);
  }, [supabase, tenantFirst, tenantLast, tenantEmail, tenantPhone, tenantRent, createdPropertyId]);

  // Save automations + mark onboarding complete
  const completeOnboarding = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save automation configs
    for (const autoId of Array.from(enabledAutomations)) {
      await supabase.from('automation_configs').upsert({
        user_id: user.id,
        type: autoId,
        enabled: true,
        settings: {},
      }, { onConflict: 'user_id,type' });
    }

    // Mark onboarding complete
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);
  }, [supabase, enabledAutomations]);

  // Navigation
  const handleNext = async () => {
    if (currentStep === 2 && propertyAddress.trim()) {
      await saveProperty();
    }
    if (currentStep === 3 && tenantFirst.trim() && tenantLast.trim()) {
      await saveTenant();
    }
    if (currentStep === 4) {
      await completeOnboarding();
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleFinish = () => router.push('/dashboard');

  function toggleAutomation(id: string) {
    setEnabledAutomations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const stepLabels = ['Welcome', 'Add Property', 'Add Tenant', 'Automations', 'Ready'];

  /* ---- Progress header -------------------------------------------- */

  const ProgressHeader = () => {
    const pct = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
    return (
      <div className="w-full mb-10">
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div className="h-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-6 flex items-start justify-between">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const completed = stepNum < currentStep;
            const current = stepNum === currentStep;
            return (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'transition-colors duration-200',
                    completed
                      ? 'bg-gold text-white border border-gold'
                      : current
                        ? 'bg-[var(--bg-primary)] text-gold border border-gold'
                        : 'bg-[var(--bg-primary)] text-muted border border-border',
                  ].join(' ')}
                >
                  {completed ? <Check className="w-4 h-4" /> : <span className="font-mono text-[12px]">{stepNum}</span>}
                </div>
                <div className="mt-2 text-[11px] font-body text-muted leading-tight text-center">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ---- Render steps ------------------------------------------------ */

  const renderStep = () => {
    switch (currentStep) {
      /* ---- Step 1: Welcome ----------------------------------------- */
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
            <h2 className="font-display font-bold text-[32px] text-white mt-6">
              {fullName ? `Welcome, ${fullName.split(' ')[0]}` : 'Welcome to RKV Consulting'}
            </h2>
            <p className="text-muted mt-2 font-body">
              <span className="inline-flex items-center gap-2 text-gold font-semibold text-[11px] uppercase tracking-[0.15em]">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                {plan.toUpperCase()}
              </span>
              <span className="text-muted"> &nbsp;— Here’s what you unlocked:</span>
            </p>
            <div className="mt-8 w-full max-w-sm text-left">
              <ul className="space-y-3">
                {[
                  { label: 'AI Deal Analyzer', icon: <TrendingUp className="w-4 h-4" /> },
                  { label: 'Portfolio Intelligence', icon: <Building2 className="w-4 h-4" /> },
                  { label: 'AI Tenant Agents', icon: <Mail className="w-4 h-4" /> },
                  { label: 'Market Intelligence', icon: <Sparkles className="w-4 h-4" /> },
                  { label: 'Accounting & Tax Center', icon: <FileText className="w-4 h-4" /> },
                ].map((feature, i) => (
                  <motion.li
                    key={feature.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-center gap-3 text-sm font-body"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0">
                      {feature.icon}
                    </div>
                    <span className="text-white/80">{feature.label}</span>
                    <Check className="w-4 h-4 text-gold ml-auto shrink-0" />
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        );

      /* ---- Step 2: Add First Property ------------------------------ */
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-white">
                  Add your first property
                </h2>
                <p className="text-muted text-sm font-body">
                  Start typing an address — we&apos;ll find it.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block font-body font-medium text-[12px] text-muted mb-1.5">
                  Property Address
                </label>
                <AddressAutocomplete
                  placeholder="Start typing an address..."
                  onAddressSelect={(addr) => {
                    setPropertyAddress(addr.fullAddress);
                    setPropertyAddressData(addr);
                  }}
                />
              </div>

              <Select
                label="Property Type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                options={PROPERTY_TYPE_OPTIONS}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Purchase Price"
                  placeholder="$250,000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className={flashFields.purchasePrice ? 'ring-2 ring-[rgba(201,168,76,0.20)]' : undefined}
                />
                <Input
                  label="Monthly Rent"
                  placeholder="$2,000"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  className={flashFields.monthlyRent ? 'ring-2 ring-[rgba(201,168,76,0.20)]' : undefined}
                />
              </div>

              {(autofillSource.attom || autofillSource.rentcast || autofillLoading) && (
                <div className="flex items-center gap-3 text-[11px] font-body">
                  {autofillLoading && <span className="text-muted">Filling details…</span>}
                  {autofillSource.attom && (
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-border bg-[var(--bg-primary)] text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      Powered by ATTOM
                    </span>
                  )}
                  {autofillSource.rentcast && (
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-border bg-[var(--bg-primary)] text-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      Rent data: Rentcast
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );

      /* ---- Step 3: Add First Tenant -------------------------------- */
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <User className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-white">
                  Add your first tenant
                </h2>
                <p className="text-muted text-sm font-body">
                  {createdPropertyId
                    ? 'Link a tenant to the property you just added.'
                    : 'Optional — you can add tenants later from the dashboard.'}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="John"
                  value={tenantFirst}
                  onChange={(e) => setTenantFirst(e.target.value)}
                  icon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={tenantLast}
                  onChange={(e) => setTenantLast(e.target.value)}
                />
              </div>

              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  placeholder="(555) 123-4567"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  icon={<Phone className="w-4 h-4" />}
                />
                <Input
                  label="Monthly Rent"
                  placeholder="$2,000"
                  value={tenantRent}
                  onChange={(e) => setTenantRent(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        );

      /* ---- Step 4: Enable Automations ------------------------------ */
      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-white">
                  Enable automations
                </h2>
                <p className="text-muted text-sm font-body">
                  Let AI handle the busywork. Toggle on what you need.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {AUTOMATION_CARDS.map((auto) => {
                const enabled = enabledAutomations.has(auto.id);
                return (
                  <button
                    key={auto.id}
                    type="button"
                    onClick={() => toggleAutomation(auto.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                      enabled
                        ? 'border-gold bg-gold/5'
                        : 'border-border bg-card hover:border-gold/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        enabled ? 'bg-gold/10 text-gold' : 'bg-deep text-muted'
                      }`}>
                        {auto.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white font-body">{auto.label}</p>
                        <p className="text-xs text-muted font-body mt-0.5">{auto.description}</p>
                      </div>
                      {/* Toggle indicator */}
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${
                        enabled ? 'bg-gold' : 'bg-border'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );

      /* ---- Step 5: You're Ready ------------------------------------ */
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
              <Sparkles className="w-10 h-10 text-gold" />
            </div>

            <h2 className="font-display font-bold text-3xl text-white">
              You&apos;re all set!
            </h2>
            <p className="text-muted mt-3 font-body max-w-sm">
              Your account is ready. Jump into your dashboard to start analyzing deals, managing properties, and growing your portfolio.
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
                {propertyAddress && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted">Property</span>
                    <span className="text-white truncate ml-4 text-right">{propertyAddress.split(',')[0]}</span>
                  </div>
                )}
                {tenantFirst && tenantLast && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted">Tenant</span>
                    <span className="text-white">{tenantFirst} {tenantLast}</span>
                  </div>
                )}
                {enabledAutomations.size > 0 && (
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-muted">Automations</span>
                    <span className="text-gold">{enabledAutomations.size} enabled</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              size="lg"
              fullWidth
              className="mt-8 max-w-sm"
              onClick={handleFinish}
              icon={<ArrowRight className="w-4 h-4" />}
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
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.12}
          colors={['#c9a84c', '#D97706', '#DC2626', '#f5f5f5']}
        />
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full">
        <ProgressHeader />

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 self-start">
          <p className="text-xs text-muted font-body">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
          <span className="text-xs text-border">—</span>
          <p className="text-xs text-gold font-body font-medium">
            {stepLabels[currentStep - 1]}
          </p>
        </div>

        {/* Step content */}
        <div className="w-full flex-1">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="w-full flex items-center justify-between mt-10 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>

            <div className="flex gap-3">
              {(currentStep === 2 || currentStep === 3) && (
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                >
                  Skip
                </Button>
              )}
              <Button
                onClick={handleNext}
                loading={savingProperty || savingTenant}
                icon={!(savingProperty || savingTenant) ? <ArrowRight className="w-4 h-4" /> : undefined}
              >
                {currentStep === 4 ? 'Finish Setup' : 'Continue'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
