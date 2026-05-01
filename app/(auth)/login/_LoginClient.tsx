'use client';

import React, { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  LogIn,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Resolved brand props passed in from the server component.
 * `accent` is preserved on the type so server-side branding logic continues
 * to work, but the visual restyle uses a fixed navy + sky-blue palette.
 */
export interface LoginBrand {
  name: string;
  accent: string;
  logo_url: string | null;
}

export default function LoginClient({ brand }: { brand: LoginBrand }) {
  return (
    <Suspense>
      <AuthPageLogin brand={brand} />
    </Suspense>
  );
}

function AuthPageLogin({ brand }: { brand: LoginBrand }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoChecking, setSsoChecking] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();

  React.useEffect(() => {
    const ssoDomain = searchParams.get('sso_domain');
    if (ssoDomain) {
      void initiateSsoForDomain(ssoDomain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initiateSsoForDomain(domain: string): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/sso/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_domain: domain }),
      });
      const data = await res.json();
      if (data.sso_url) {
        window.location.href = data.sso_url;
        return true;
      }
    } catch (e) {
      console.error('SSO initiate failed', e);
    }
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  async function handleSsoButton() {
    setError('');
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      setError('Enter your work email first to use SSO.');
      return;
    }
    setSsoChecking(true);
    const redirected = await initiateSsoForDomain(domain);
    setSsoChecking(false);
    if (!redirected) {
      setError('No SSO configured for this email domain.');
    }
  }

  return (
    <main className="min-h-screen w-full bg-white font-sans md:grid md:grid-cols-5">
      {/* Left rail — 40% on desktop, hidden on mobile */}
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
          {brand.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo_url} alt={brand.name} className="h-9 w-9 rounded-md object-contain bg-white/5 p-1" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-5 w-5 text-sky-300" />
            </div>
          )}
          <span className="font-display text-lg font-semibold tracking-tight">
            {brand.name}
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl font-bold leading-tight text-white">
            The AI co-pilot for property management.
          </p>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Automate leasing, maintenance, and reporting so your team can focus on the
            decisions that actually move the needle.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-sky-400" />
          <span>SOC 2 compliant. 256-bit encrypted at rest.</span>
        </div>
      </aside>

      {/* Right side — 60% on desktop, full on mobile */}
      <section className="relative flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 md:col-span-3 md:py-16 bg-white">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile-only brand */}
          <div className="md:hidden mb-8 flex items-center gap-2.5">
            {brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0F172A]">
                <Building2 className="h-4 w-4 text-sky-300" />
              </div>
            )}
            <span className="font-display text-base font-semibold text-[#0F172A]">
              {brand.name}
            </span>
          </div>

          <header className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F172A]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to your property management dashboard.
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className={cn(
                  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0F172A] placeholder:text-slate-400',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 focus-visible:border-[#0369A1]',
                  'transition',
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#0369A1] hover:text-[#075985] transition-colors cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className={cn(
                  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0F172A] placeholder:text-slate-400',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 focus-visible:border-[#0369A1]',
                  'transition',
                )}
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
              <LogIn className="h-4 w-4" />
              {loading || ssoChecking ? (ssoChecking ? 'Checking SSO…' : 'Signing in…') : 'Sign in'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-wider text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleSsoButton}
            disabled={ssoChecking}
            className={cn(
              'inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 cursor-pointer',
              'hover:bg-slate-50 hover:border-[#0369A1] hover:text-[#0369A1] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            <KeyRound className="h-4 w-4" />
            Sign in with SSO
          </button>

          <p className="mt-8 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-[#0369A1] hover:text-[#075985] transition-colors cursor-pointer"
            >
              Get started free
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
            By signing in you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-slate-600 transition-colors">
              Terms
            </Link>{' '}
            &amp;{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-600 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
