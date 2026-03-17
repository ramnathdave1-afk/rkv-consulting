'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
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
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Validating invitation...</div>
      </div>
    );
  }

  // Invalid token — but show self-serve signup instead of blocking
  if (token && tokenValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold text-text-primary mb-3">
            Invalid or Expired Invite
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            This invitation link is no longer valid. You can still create a free account.
          </p>
          <Link
            href="/signup"
            className="inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
          >
            Create Free Account
          </Link>
          <p className="mt-4">
            <Link
              href="/login"
              className="text-sm text-text-muted hover:text-accent transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Self-serve signup form
  if (isSelfServe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold text-text-primary">
              Meridian Node
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Create your free account
            </p>
          </div>

          <form onSubmit={handleSelfServeSignup} className="glass-card p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Company Name <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Min 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Start Free — Explorer Plan'}
            </button>

            <p className="text-center text-[10px] text-text-muted">
              Free plan includes 5 sites, 100 API calls/mo, and 3 feasibility analyses/mo
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-text-muted">
            Meridian Node by RKV Consulting LLC
          </p>
        </div>
      </div>
    );
  }

  // Invite-based signup form
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Meridian Node
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Create your account
          </p>
        </div>

        <form onSubmit={handleInviteSignup} className="glass-card p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-danger-muted px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-secondary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Min 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-muted">
          Meridian Node by RKV Consulting LLC
        </p>
      </div>
    </div>
  );
}
