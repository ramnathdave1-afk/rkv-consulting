'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Building2, KeyRound, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputCls = cn(
  'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-[#0F172A] placeholder:text-slate-400',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2 focus-visible:border-[#0369A1]',
  'transition',
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

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
            Locked out? Happens to the best of us.
          </p>
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">
            Enter your email and we&apos;ll send you a secure reset link. The link expires in 60 minutes.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-sky-400" />
          <span>SOC 2 compliant. 256-bit encrypted at rest.</span>
        </div>
      </aside>

      <section className="relative flex min-h-screen flex-col justify-center px-6 py-12 sm:px-10 md:col-span-3 md:py-16 bg-white">
        <div className="mx-auto w-full max-w-sm">
          <header className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F172A]">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              We&apos;ll email you a secure link to set a new password.
            </p>
          </header>

          {sent ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-[#0F172A] mb-3 font-medium">Check your email</p>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                If an account exists for <span className="font-medium text-[#0F172A]">{email}</span>,
                a reset link is on its way.
              </p>
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-[#0369A1] hover:text-[#0369A1] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <KeyRound className="h-4 w-4" />
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600">
                Remember it after all?{' '}
                <Link href="/login" className="font-semibold text-[#0369A1] hover:text-[#075985] transition-colors cursor-pointer">
                  Back to sign in
                </Link>
              </p>
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            RKV Consulting by RKV Consulting LLC
          </p>
        </div>
      </section>
    </main>
  );
}
