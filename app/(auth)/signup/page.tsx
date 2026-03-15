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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [invitation, setInvitation] = useState<{ org_id: string; role: string; email: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supabase = createClient();

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

  async function handleSubmit(e: React.FormEvent) {
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
      // Create profile
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

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token);

      router.push('/dashboard');
      router.refresh();
    }
  }

  if (tokenValid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Validating invitation...</div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold text-text-primary mb-3">
            Invite Required
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            Meridian Node is invite-only. You need a valid invitation link to create an account.
          </p>
          <Link
            href="/login"
            className="text-sm text-accent hover:text-accent-hover transition-colors"
          >
            Already have an account? Sign in
          </Link>
          <p className="mt-8 text-xs text-text-muted">
            Meridian Node by RKV Consulting LLC
          </p>
        </div>
      </div>
    );
  }

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

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
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
