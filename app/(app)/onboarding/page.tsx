'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  MessageSquare,
  Wrench,
  BarChart3,
  Rocket,
  Users,
  Palette,
  Plug,
  Upload,
  Mail,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Rocket },
  { id: 'plan', label: 'Plan', icon: BarChart3 },
  { id: 'first_property', label: 'First Property', icon: Building2 },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'tour', label: 'Tour', icon: BarChart3 },
] as const;

const STEP_TO_API: Record<string, string> = {
  welcome: 'org_setup',
  plan: 'plan',
  first_property: 'first_property',
  branding: 'branding',
  team: 'team',
  integrations: 'integrations',
  tour: 'tour',
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step state
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Owner / Operator');
  const [plan, setPlan] = useState<'trial' | 'starter' | 'growth' | 'enterprise'>('trial');
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address_line1: '',
    city: '',
    state: '',
    zip: '',
    unit_count: 1,
  });
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#0369A1');
  const [logoUrl, setLogoUrl] = useState('');
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([
    { email: '', role: 'manager' },
  ]);
  const [integration, setIntegration] = useState<string | null>(null);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [tourSlide, setTourSlide] = useState(0);

  // Bootstrap from existing profile
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company, onboarding_step')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.company) {
        setCompanyName(profile.company);
        setBrandName(profile.company);
      }

      // Resume at saved step
      if (profile?.onboarding_step) {
        const apiToIdx: Record<string, number> = {
          org_setup: 0,
          plan: 1,
          first_property: 2,
          branding: 3,
          team: 4,
          integrations: 5,
          tour: 6,
        };
        const idx = apiToIdx[profile.onboarding_step];
        if (typeof idx === 'number') setStepIdx(idx);
      }
    })();
  }, [router, supabase]);

  const currentStep = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  async function persistStep(data: Record<string, unknown>) {
    const apiStep = STEP_TO_API[currentStep.id];
    const res = await fetch('/api/onboarding/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: apiStep, data }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Failed to save step');
    }
  }

  async function goNext() {
    setLoading(true);
    setError('');
    try {
      switch (currentStep.id) {
        case 'welcome': {
          // Persist name/company/role to profile + org
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error('Not signed in');

          await supabase
            .from('profiles')
            .update({ full_name: fullName, company: companyName })
            .eq('user_id', user.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile?.org_id && companyName) {
            await supabase
              .from('organizations')
              .update({ name: companyName })
              .eq('id', profile.org_id);
          }

          await persistStep({ fullName, companyName, role });
          break;
        }
        case 'plan': {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('user_id', user!.id)
            .maybeSingle();
          if (profile?.org_id) {
            await supabase.from('organizations').update({ plan }).eq('id', profile.org_id);
          }
          await persistStep({ plan });
          break;
        }
        case 'first_property': {
          if (propertyForm.name && propertyForm.address_line1) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            const { data: profile } = await supabase
              .from('profiles')
              .select('org_id')
              .eq('user_id', user!.id)
              .maybeSingle();

            if (profile?.org_id) {
              await supabase.from('properties').insert({
                org_id: profile.org_id,
                name: propertyForm.name,
                address_line1: propertyForm.address_line1,
                city: propertyForm.city,
                state: propertyForm.state,
                zip: propertyForm.zip,
                unit_count: propertyForm.unit_count,
                property_type: 'multifamily',
                created_by: user!.id,
              });
            }
          }
          await persistStep({ property: propertyForm, sampleLoaded });
          break;
        }
        case 'branding': {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('user_id', user!.id)
            .maybeSingle();
          if (profile?.org_id) {
            await supabase
              .from('organizations')
              .update({
                brand_name: brandName,
                brand_primary_color: brandColor,
                brand_color: brandColor,
                brand_logo_url: logoUrl || null,
              })
              .eq('id', profile.org_id);
          }
          await persistStep({ brandName, brandColor, logoUrl });
          break;
        }
        case 'team': {
          const valid = invites.filter((i) => i.email.trim());
          for (const inv of valid) {
            await fetch('/api/team/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: inv.email, role: inv.role }),
            }).catch(() => {});
          }
          await persistStep({ invites: valid });
          break;
        }
        case 'integrations': {
          await persistStep({ integration });
          break;
        }
        case 'tour': {
          const res = await fetch('/api/onboarding/complete', { method: 'POST' });
          const j = await res.json();
          if (j.redirect) router.push(j.redirect);
          return;
        }
      }
      setStepIdx((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function skipStep() {
    setLoading(true);
    try {
      const apiStep = STEP_TO_API[currentStep.id];
      await fetch('/api/onboarding/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: apiStep }),
      });
      setStepIdx((s) => Math.min(s + 1, STEPS.length - 1));
    } finally {
      setLoading(false);
    }
  }

  async function loadSampleData() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/sample-data', { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to load demo data');
      }
      setSampleLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load demo data');
    } finally {
      setLoading(false);
    }
  }

  function back() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-12 font-sans sm:px-6 sm:py-16">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-sm tabular-nums text-[#0F172A]">
              Step {stepIdx + 1} / {STEPS.length}
            </span>
            <span className="font-mono text-sm tabular-nums text-slate-500">
              {Math.round(((stepIdx + 1) / STEPS.length) * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i < stepIdx && 'bg-[#0369A1]',
                  i === stepIdx && 'bg-[#0F172A]',
                  i > stepIdx && 'bg-slate-200',
                )}
              />
            ))}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500">{currentStep.label}</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
          >
            {currentStep.id === 'welcome' && (
              <WelcomeStep
                fullName={fullName}
                setFullName={setFullName}
                companyName={companyName}
                setCompanyName={setCompanyName}
                role={role}
                setRole={setRole}
              />
            )}
            {currentStep.id === 'plan' && <PlanStep plan={plan} setPlan={setPlan} />}
            {currentStep.id === 'first_property' && (
              <PropertyStep
                form={propertyForm}
                setForm={setPropertyForm}
                onLoadSample={loadSampleData}
                sampleLoaded={sampleLoaded}
                loading={loading}
              />
            )}
            {currentStep.id === 'branding' && (
              <BrandingStep
                brandName={brandName}
                setBrandName={setBrandName}
                color={brandColor}
                setColor={setBrandColor}
                logoUrl={logoUrl}
                setLogoUrl={setLogoUrl}
              />
            )}
            {currentStep.id === 'team' && <TeamStep invites={invites} setInvites={setInvites} />}
            {currentStep.id === 'integrations' && (
              <IntegrationsStep integration={integration} setIntegration={setIntegration} />
            )}
            {currentStep.id === 'tour' && (
              <TourStep slide={tourSlide} setSlide={setTourSlide} />
            )}

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={back}
            disabled={stepIdx === 0 || loading}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 cursor-pointer',
              'hover:bg-slate-50 hover:border-slate-300 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <button
            onClick={skipStep}
            disabled={loading || isLast}
            className={cn(
              'inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 cursor-pointer',
              'hover:bg-slate-50 hover:border-slate-300 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            Skip
          </button>

          <button
            onClick={goNext}
            disabled={loading}
            className={cn(
              'ml-auto inline-flex h-10 items-center gap-1.5 rounded-md bg-[#0369A1] px-4 text-sm font-semibold text-white cursor-pointer',
              'hover:bg-[#075985] active:bg-[#0C4A6E] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {loading ? (
              'Saving…'
            ) : isLast ? (
              <>
                <CheckCircle2 size={14} />
                Go to dashboard
              </>
            ) : (
              <>
                Next
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Step components ────────────────────────────────────────────────── */

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-sky-50 ring-1 ring-sky-100">
        <Icon size={22} className="text-[#0369A1]" />
      </div>
      <h2 className="font-display text-3xl font-bold tracking-tight text-[#020617]">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

const inputCls = cn(
  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0F172A] placeholder:text-slate-400',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 focus-visible:border-[#0369A1]',
  'transition',
);

const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700';

function WelcomeStep({
  fullName,
  setFullName,
  companyName,
  setCompanyName,
  role,
  setRole,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
}) {
  return (
    <>
      <StepHeader
        icon={Rocket}
        title="Welcome to RKV Consulting"
        subtitle="Let's set up your AI-powered property management platform."
      />
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Your name</label>
          <input
            className={inputCls}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className={labelCls}>Company name</label>
          <input
            className={inputCls}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Property Management"
          />
        </div>
        <div>
          <label className={labelCls}>Your role</label>
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
            <option>Owner / Operator</option>
            <option>Property Manager</option>
            <option>Leasing Agent</option>
            <option>Maintenance Coordinator</option>
            <option>Other</option>
          </select>
        </div>
      </div>
    </>
  );
}

function PlanStep({
  plan,
  setPlan,
}: {
  plan: string;
  setPlan: (v: 'trial' | 'starter' | 'growth' | 'enterprise') => void;
}) {
  const plans: Array<{
    id: 'trial' | 'starter' | 'growth' | 'enterprise';
    name: string;
    price: string;
    desc: string;
    features: string[];
    highlight?: boolean;
  }> = [
    {
      id: 'trial',
      name: '14-Day Trial',
      price: 'Free',
      desc: 'Full access, no credit card',
      features: ['All features', 'Up to 50 units', 'Email support'],
      highlight: true,
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$99/mo',
      desc: 'For small portfolios',
      features: ['Up to 50 units', 'AI leasing + maintenance', 'Standard support'],
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '$299/mo',
      desc: 'For scaling teams',
      features: ['Up to 250 units', 'Full AI suite', 'Owner reports'],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      desc: 'For large operators',
      features: ['500+ units', 'SSO + white-label', 'SLA + priority'],
    },
  ];
  return (
    <>
      <StepHeader
        icon={BarChart3}
        title="Choose your plan"
        subtitle="Start with a free trial — change or cancel any time."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans.map((p) => {
          const selected = plan === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              className={cn(
                'group relative flex flex-col rounded-lg border bg-white p-4 text-left transition-all cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
                selected
                  ? 'border-[#0369A1] ring-2 ring-[#0369A1]'
                  : 'border-slate-200 hover:border-slate-300',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-display text-base font-semibold text-[#0F172A]">{p.name}</span>
                {p.highlight && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#0369A1] ring-1 ring-sky-100">
                    Recommended
                  </span>
                )}
              </div>
              <div className="font-mono text-xl tabular-nums font-bold text-[#0F172A]">{p.price}</div>
              <p className="mt-1 text-xs text-slate-600">{p.desc}</p>
              <ul className="mt-3 space-y-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <CheckCircle2
                      size={12}
                      className={cn('mt-0.5 shrink-0', selected ? 'text-[#0369A1]' : 'text-slate-400')}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </>
  );
}

function PropertyStep({
  form,
  setForm,
  onLoadSample,
  sampleLoaded,
  loading,
}: {
  form: { name: string; address_line1: string; city: string; state: string; zip: string; unit_count: number };
  setForm: (f: typeof form) => void;
  onLoadSample: () => void;
  sampleLoaded: boolean;
  loading: boolean;
}) {
  return (
    <>
      <StepHeader
        icon={Building2}
        title="Add your first property"
        subtitle="Or skip to import a CSV / load demo data."
      />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Property name</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Sunset Apartments"
          />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Address</label>
          <input
            className={inputCls}
            value={form.address_line1}
            onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
            placeholder="123 Main St"
          />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input
            className={inputCls}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input
            className={inputCls}
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            maxLength={2}
          />
        </div>
        <div>
          <label className={labelCls}>ZIP</label>
          <input
            className={inputCls}
            value={form.zip}
            onChange={(e) => setForm({ ...form, zip: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}># Units</label>
          <input
            type="number"
            min={1}
            className={cn(inputCls, 'font-mono tabular-nums')}
            value={form.unit_count}
            onChange={(e) => setForm({ ...form, unit_count: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-[#0F172A]">Just exploring?</span> Load demo data to see
          the platform in action.
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/import"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-white hover:border-[#0369A1] hover:text-[#0369A1] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
          >
            <Upload size={12} /> Import CSV
          </a>
          <button
            onClick={onLoadSample}
            disabled={loading || sampleLoaded}
            className={cn(
              'inline-flex h-9 items-center rounded-md bg-transparent px-3 text-xs font-medium text-[#0369A1] cursor-pointer',
              'hover:bg-sky-50 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {sampleLoaded ? 'Demo data loaded' : 'Load sample data'}
          </button>
        </div>
      </div>
    </>
  );
}

function BrandingStep({
  brandName,
  setBrandName,
  color,
  setColor,
  logoUrl,
  setLogoUrl,
}: {
  brandName: string;
  setBrandName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
}) {
  const presets = [
    { label: 'Navy', value: '#0F172A' },
    { label: 'Sky', value: '#0369A1' },
    { label: 'Emerald', value: '#059669' },
    { label: 'Violet', value: '#7C3AED' },
    { label: 'Amber', value: '#D97706' },
  ];

  return (
    <>
      <StepHeader
        icon={Palette}
        title="Set up your brand"
        subtitle="Customize what tenants and owners see."
      />
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Brand name</label>
          <input
            className={inputCls}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Acme Property Management"
          />
        </div>
        <div>
          <label className={labelCls}>
            Logo URL <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            className={inputCls}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…/logo.png"
          />
        </div>
        <div>
          <label className={labelCls}>Primary color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-md border border-slate-200 bg-white"
            />
            <input
              className={cn(inputCls, 'font-mono tabular-nums uppercase')}
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setColor(p.value)}
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-md border bg-white px-2 text-xs font-medium text-slate-700 cursor-pointer',
                  'hover:bg-slate-50 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
                  color.toLowerCase() === p.value.toLowerCase()
                    ? 'border-[#0369A1] ring-1 ring-[#0369A1]'
                    : 'border-slate-200',
                )}
              >
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.value }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Preview</div>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-md text-white"
              style={{ backgroundColor: color }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <div className="font-display text-base font-semibold" style={{ color: '#0F172A' }}>
                {brandName || 'Your Brand'}
              </div>
              <div className="text-xs font-medium" style={{ color }}>
                Powered by RKV Consulting
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TeamStep({
  invites,
  setInvites,
}: {
  invites: { email: string; role: string }[];
  setInvites: (v: { email: string; role: string }[]) => void;
}) {
  function update(i: number, patch: Partial<{ email: string; role: string }>) {
    const next = invites.slice();
    next[i] = { ...next[i], ...patch };
    setInvites(next);
  }
  function add() {
    setInvites([...invites, { email: '', role: 'manager' }]);
  }
  function remove(i: number) {
    setInvites(invites.filter((_, idx) => idx !== i));
  }
  return (
    <>
      <StepHeader
        icon={Users}
        title="Invite your team"
        subtitle="Add teammates by email — they'll get a sign-up link."
      />
      <div className="space-y-2.5">
        {invites.map((inv, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={inputCls}
              type="email"
              placeholder="teammate@company.com"
              value={inv.email}
              onChange={(e) => update(i, { email: e.target.value })}
            />
            <select
              className={cn(inputCls, 'max-w-[140px]')}
              value={inv.role}
              onChange={(e) => update(i, { role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={() => remove(i)}
              disabled={invites.length === 1}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
              aria-label="Remove invite"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={add}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0369A1] hover:text-[#075985] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 rounded"
        >
          <Mail size={14} /> Add another teammate
        </button>
      </div>
    </>
  );
}

function IntegrationsStep({
  integration,
  setIntegration,
}: {
  integration: string | null;
  setIntegration: (v: string | null) => void;
}) {
  const options = [
    { id: 'appfolio', name: 'AppFolio', desc: 'Sync properties, units, leases, tenants' },
    { id: 'buildium', name: 'Buildium', desc: 'Two-way sync of portfolios + financials' },
    { id: 'yardi', name: 'Yardi', desc: 'Voyager / Breeze integration' },
    { id: 'rent_manager', name: 'Rent Manager', desc: 'Rent Manager 12.x API integration' },
  ];
  return (
    <>
      <StepHeader
        icon={Plug}
        title="Connect a PM platform"
        subtitle="We'll auto-import properties, units, leases, and tenants."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const selected = integration === o.id;
          return (
            <div
              key={o.id}
              className={cn(
                'flex flex-col gap-3 rounded-lg border bg-white p-4 transition-all',
                selected ? 'border-[#0369A1] ring-2 ring-[#0369A1]' : 'border-slate-200',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 ring-1 ring-slate-200">
                  <span className="font-display text-sm font-bold text-[#0F172A]">
                    {o.name.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-semibold text-[#0F172A]">{o.name}</div>
                  <div className="text-xs text-slate-600">{o.desc}</div>
                </div>
              </div>
              <button
                onClick={() => setIntegration(selected ? null : o.id)}
                className={cn(
                  'inline-flex h-8 w-full items-center justify-center rounded-md text-xs font-semibold cursor-pointer transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
                  selected
                    ? 'bg-[#0369A1] text-white hover:bg-[#075985]'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-[#0369A1] hover:text-[#0369A1]',
                )}
              >
                {selected ? 'Connected' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        You can configure these later from{' '}
        <a className="font-medium text-[#0369A1] hover:text-[#075985] transition-colors" href="/integrations">
          Integrations
        </a>
        .
      </p>
    </>
  );
}

function TourStep({ slide, setSlide }: { slide: number; setSlide: (n: number) => void }) {
  const slides = [
    {
      title: 'Manage Your Portfolio',
      description: 'Add properties, units, tenants, and leases — or sync from your PM platform.',
      icon: Building2,
    },
    {
      title: 'AI Leasing Agent',
      description: 'Inbound SMS, email, and chat handled 24/7 — leads qualified, showings booked.',
      icon: MessageSquare,
    },
    {
      title: 'Maintenance Coordination',
      description: 'Tenants text, AI triages, vendors get dispatched.',
      icon: Wrench,
    },
    {
      title: 'Reports & Analytics',
      description: 'Real-time dashboards. One-click owner reports.',
      icon: BarChart3,
    },
  ];
  const s = slides[slide];
  const Icon = s.icon;
  return (
    <>
      <StepHeader
        icon={Rocket}
        title="You're all set!"
        subtitle="Take a quick tour, then dive in."
      />
      <div className="rounded-md border border-slate-200 bg-slate-50 p-8">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-sky-50 ring-1 ring-sky-100">
            <Icon size={24} className="text-[#0369A1]" />
          </div>
          <div className="font-display text-xl font-bold text-[#0F172A]">{s.title}</div>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.description}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={cn(
              'h-2 rounded-full transition-all cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
              i === slide ? 'w-6 bg-[#0369A1]' : 'w-2 bg-slate-300 hover:bg-slate-400',
            )}
            aria-label={`Tour slide ${i + 1}`}
          />
        ))}
      </div>
    </>
  );
}
