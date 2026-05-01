'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, UserPlus, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

const inputCls = cn(
  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0F172A] placeholder:text-slate-400',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 focus-visible:border-[#0369A1]',
  'transition',
);

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full bg-white font-sans md:grid md:grid-cols-5">
      <aside className="relative hidden md:col-span-2 md:flex md:flex-col md:justify-between bg-[#0F172A] p-10 text-white overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-24 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18)_0%,transparent_70%)] pointer-events-none"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
            <Building2 className="h-5 w-5 text-sky-300" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">RKV Consulting</span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl font-bold leading-tight text-white">
            Join the AI co-pilot for property management.
          </p>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Spin up your workspace in two minutes. No credit card required to start.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-sky-400" />
          <span>SOC 2 compliant. 256-bit encrypted at rest.</span>
        </div>
      </aside>

      <section className="relative flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 md:col-span-3 md:py-16 bg-white">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}

function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [invitation, setInvitation] = useState<{ org_id: string; role: string; email: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = createClient();

  // If there's no token, allow self-serve signup
  const isSelfServe = !token;

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }

    async function validateToken() {
      const { data, error } = await supabase
        .from('invitations')
        .select('org_id, role, email, expires_at, accepted_at')
        .eq('token', token)
        .single();

      if (error || !data || data.accepted_at || new Date(data.expires_at) < new Date()) {
        setTokenValid(false);
        return;
      }

      setInvitation({ org_id: data.org_id, role: data.role, email: data.email });
      setEmail(data.email);
      setTokenValid(true);
    }

    validateToken();
  }, [token, supabase]);

  async function handleInviteSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!invitation || !token) return;

    setLoading(true);
    setError('');

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        org_id: invitation.org_id,
        full_name: fullName,
        email,
        role: invitation.role,
        // Invitees join an existing org that may already be set up, but we
        // still walk them through a quick personal-onboarding pass.
        onboarding_completed: false,
        onboarding_step: 'org_setup',
      });

      if (profileError) {
        setError('Account created but profile setup failed. Contact your admin.');
        setLoading(false);
        return;
      }

      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token);

      // Send welcome email (fire-and-forget)
      fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      }).catch(() => {});

      router.push('/onboarding');
      router.refresh();
    }
  }

  async function handleSelfServeSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Auto-create organization
      const orgName = companyName || `${fullName}'s Organization`;
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName })
        .select()
        .single();

      if (orgError) {
        setError('Account created but org setup failed. Please contact support.');
        setLoading(false);
        return;
      }

      // Create profile as admin of new org
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        org_id: org.id,
        full_name: fullName,
        email,
        role: 'admin',
        company: companyName || null,
        onboarding_completed: false,
        onboarding_step: 'org_setup',
      });

      if (profileError) {
        setError('Account created but profile setup failed. Please contact support.');
        setLoading(false);
        return;
      }

      // Send welcome email (fire-and-forget)
      fetch('/api/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      }).catch(() => {});

      router.push('/onboarding');
      router.refresh();
    }
  }

  // Loading invite validation
  if (token && tokenValid === null) {
    return (
      <AuthShell>
        <div className="text-center text-sm text-slate-600">Validating invitation…</div>
      </AuthShell>
    );
  }

  // Invalid token — but show self-serve signup instead of blocking
  if (token && tokenValid === false) {
    return (
      <AuthShell>
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-[#0F172A] mb-2">Invalid or expired invite</h1>
          <p className="text-sm text-slate-600 mb-6">
            This invitation link is no longer valid. You can still create a free account.
          </p>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#0369A1] px-4 text-sm font-semibold text-white hover:bg-[#075985] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
          >
            Create free account
          </Link>
          <p className="mt-6">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-[#0369A1] transition-colors cursor-pointer"
            >
              Already have an account? Sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  // Self-serve signup form
  if (isSelfServe) {
    return (
      <AuthShell>
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F172A]">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Free for 14 days. No credit card required.
          </p>
        </header>

        {error && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSelfServeSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputCls}
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Company name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls}
              placeholder="Acme Property Management"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className={inputCls}
              placeholder="Minimum 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0369A1] px-4 text-sm font-semibold text-white cursor-pointer',
              'hover:bg-[#075985] active:bg-[#0C4A6E] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <UserPlus className="h-4 w-4" />
            {loading ? 'Creating account…' : 'Start free — Explorer plan'}
          </button>

          <p className="text-center text-xs text-slate-500 leading-relaxed">
            Free plan includes 5 sites, 100 API calls/mo, and 3 feasibility analyses/mo.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#0369A1] hover:text-[#075985] transition-colors cursor-pointer">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          RKV Consulting by RKV Consulting LLC
        </p>
      </AuthShell>
    );
  }

  // Invite-based signup form
  return (
    <AuthShell>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F172A]">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You&apos;ve been invited to join the team.
        </p>
      </header>

      {error && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleInviteSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={inputCls}
            placeholder="John Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className={cn(inputCls, 'bg-slate-50 text-slate-500 cursor-not-allowed')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className={inputCls}
            placeholder="Minimum 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#0369A1] px-4 text-sm font-semibold text-white cursor-pointer',
            'hover:bg-[#075985] active:bg-[#0C4A6E] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          <UserPlus className="h-4 w-4" />
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        RKV Consulting by RKV Consulting LLC
      </p>
    </AuthShell>
  );
}
