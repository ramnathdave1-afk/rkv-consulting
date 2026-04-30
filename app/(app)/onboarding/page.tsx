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
  Sparkles,
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
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'plan', label: 'Plan', icon: Sparkles },
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

type StepId = (typeof STEPS)[number]['id'];

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
  const [brandColor, setBrandColor] = useState('#00D4AA');
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
    <div className="flex min-h-screen items-center justify-center p-6 bg-bg-primary">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 text-xs text-text-muted">
            <span>
              Step {stepIdx + 1} of {STEPS.length}
            </span>
            <span>{Math.round(((stepIdx + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i <= stepIdx ? 'bg-accent' : 'bg-border',
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="glass-card p-8"
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
              <div className="mt-4 rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={back}
            disabled={stepIdx === 0 || loading}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <button
            onClick={skipStep}
            disabled={loading || isLast}
            className="text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-30"
          >
            Skip this step
          </button>

          <button
            onClick={goNext}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? (
              'Saving…'
            ) : isLast ? (
              <>
                <CheckCircle2 size={14} />
                Go to Dashboard
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

function StepHeader({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
        <Icon size={26} className="text-accent" />
      </div>
      <h2 className="font-display text-xl font-bold text-text-primary mb-1.5">{title}</h2>
      <p className="text-sm text-text-secondary">{subtitle}</p>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

function WelcomeStep({ fullName, setFullName, companyName, setCompanyName, role, setRole }: {
  fullName: string; setFullName: (v: string) => void;
  companyName: string; setCompanyName: (v: string) => void;
  role: string; setRole: (v: string) => void;
}) {
  return (
    <>
      <StepHeader icon={Sparkles} title="Welcome to RKV Consulting" subtitle="Let's set up your AI-powered property management platform." />
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Your Name</label>
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Company Name</label>
          <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Property Management" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Your Role</label>
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

function PlanStep({ plan, setPlan }: { plan: string; setPlan: (v: 'trial' | 'starter' | 'growth' | 'enterprise') => void }) {
  const plans = [
    { id: 'trial', name: '14-Day Trial', price: 'Free', desc: 'Full access, no credit card', highlight: true },
    { id: 'starter', name: 'Starter', price: '$99/mo', desc: 'Up to 50 units, AI leasing + maintenance' },
    { id: 'growth', name: 'Growth', price: '$299/mo', desc: 'Up to 250 units, full AI suite + reports' },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom', desc: '500+ units, SSO, white-label, SLA' },
  ];
  return (
    <>
      <StepHeader icon={Sparkles} title="Choose Your Plan" subtitle="Start with a free trial — change or cancel any time." />
      <div className="space-y-2">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlan(p.id as 'trial' | 'starter' | 'growth' | 'enterprise')}
            className={cn(
              'w-full text-left rounded-lg border p-3 transition-colors',
              plan === p.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50',
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  {p.name}
                  {p.highlight && <span className="text-[10px] uppercase tracking-wider bg-accent/20 text-accent rounded px-1.5 py-0.5">Recommended</span>}
                </div>
                <div className="text-xs text-text-muted mt-0.5">{p.desc}</div>
              </div>
              <div className="text-sm font-display font-bold text-accent">{p.price}</div>
            </div>
          </button>
        ))}
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
      <StepHeader icon={Building2} title="Add Your First Property" subtitle="Or skip to import a CSV / load demo data." />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Property Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sunset Apartments" />
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Address</label>
          <input className={inputCls} value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} placeholder="123 Main St" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">City</label>
          <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">State</label>
          <input className={inputCls} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">ZIP</label>
          <input className={inputCls} value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary"># Units</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={form.unit_count}
            onChange={(e) => setForm({ ...form, unit_count: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center justify-between rounded-lg border border-border bg-bg-primary/40 p-3">
        <div className="text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">Just exploring?</span> Load demo data
          to see the platform in action.
        </div>
        <div className="flex gap-2">
          <a
            href="/import"
            className="text-xs px-3 py-1.5 rounded border border-border hover:border-accent transition-colors text-text-secondary inline-flex items-center gap-1.5"
          >
            <Upload size={12} /> Import CSV
          </a>
          <button
            onClick={onLoadSample}
            disabled={loading || sampleLoaded}
            className="text-xs px-3 py-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
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
  brandName: string; setBrandName: (v: string) => void;
  color: string; setColor: (v: string) => void;
  logoUrl: string; setLogoUrl: (v: string) => void;
}) {
  return (
    <>
      <StepHeader icon={Palette} title="Set Up Your Brand" subtitle="Customize what tenants and owners see." />
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Brand Name</label>
          <input className={inputCls} value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Acme Property Management" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Logo URL <span className="text-text-muted font-normal">(optional)</span></label>
          <input className={inputCls} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 rounded border border-border bg-transparent cursor-pointer"
            />
            <input className={inputCls} value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <div className="rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded" style={{ backgroundColor: color }} />
          <div>
            <div className="text-xs text-text-muted">Preview</div>
            <div className="text-sm font-semibold" style={{ color }}>
              {brandName || 'Your Brand'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TeamStep({ invites, setInvites }: { invites: { email: string; role: string }[]; setInvites: (v: { email: string; role: string }[]) => void }) {
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
      <StepHeader icon={Users} title="Invite Your Team" subtitle="Add teammates by email — they'll get a sign-up link." />
      <div className="space-y-2">
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
              className={inputCls + ' max-w-[140px]'}
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
              className="text-text-muted hover:text-danger disabled:opacity-30 p-2"
              aria-label="Remove invite"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={add}
          className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1"
        >
          <Mail size={12} /> Add another teammate
        </button>
      </div>
    </>
  );
}

function IntegrationsStep({ integration, setIntegration }: { integration: string | null; setIntegration: (v: string | null) => void }) {
  const options = [
    { id: 'appfolio', name: 'AppFolio', desc: 'Sync properties, units, leases, tenants' },
    { id: 'buildium', name: 'Buildium', desc: 'Two-way sync of portfolios + financials' },
    { id: 'yardi', name: 'Yardi', desc: 'Voyager / Breeze integration' },
    { id: 'rent_manager', name: 'Rent Manager', desc: 'Rent Manager 12.x API integration' },
  ];
  return (
    <>
      <StepHeader icon={Plug} title="Connect a PM Platform" subtitle="We'll auto-import properties, units, leases, and tenants." />
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setIntegration(integration === o.id ? null : o.id)}
            className={cn(
              'text-left rounded-lg border p-3 transition-colors',
              integration === o.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50',
            )}
          >
            <div className="text-sm font-semibold text-text-primary">{o.name}</div>
            <div className="text-xs text-text-muted mt-0.5">{o.desc}</div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-text-muted text-center">
        You can configure these later from <a className="text-accent" href="/integrations">Integrations</a>.
      </p>
    </>
  );
}

function TourStep({ slide, setSlide }: { slide: number; setSlide: (n: number) => void }) {
  const slides = [
    { title: 'Manage Your Portfolio', description: 'Add properties, units, tenants, and leases — or sync from your PM platform.', icon: Building2, color: '#00D4AA' },
    { title: 'AI Leasing Agent', description: 'Inbound SMS, email, and chat handled 24/7 — leads qualified, showings booked.', icon: MessageSquare, color: '#3B82F6' },
    { title: 'Maintenance Coordination', description: 'Tenants text, AI triages, vendors get dispatched.', icon: Wrench, color: '#F59E0B' },
    { title: 'Reports & Analytics', description: 'Real-time dashboards. One-click owner reports.', icon: BarChart3, color: '#8A00FF' },
  ];
  const s = slides[slide];
  return (
    <>
      <StepHeader icon={BarChart3} title="You're All Set!" subtitle="Take a quick tour, then dive in." />
      <div className="flex items-center justify-center my-6">
        <div className="text-center max-w-sm">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4"
            style={{ backgroundColor: `${s.color}15` }}
          >
            <s.icon size={28} className="" style={{ color: s.color }} />
          </div>
          <div className="font-display text-base font-bold text-text-primary mb-2">{s.title}</div>
          <p className="text-sm text-text-secondary leading-relaxed">{s.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === slide ? 'w-6 bg-accent' : 'w-1.5 bg-border',
            )}
            aria-label={`Tour slide ${i + 1}`}
          />
        ))}
      </div>
    </>
  );
}
