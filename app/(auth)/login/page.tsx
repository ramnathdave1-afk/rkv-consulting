'use client';

import React, { Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AtSignIcon,
  ChevronLeftIcon,
  LockIcon,
  Building2,
  ArrowRightIcon,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  return (
    <Suspense>
      <AuthPageLogin />
    </Suspense>
  );
}

function AuthPageLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const supabase = createClient();

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

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2 bg-[#06080C]">
      {/* ─── Left panel — floating paths + branding (unchanged) ─── */}
      <div className="relative hidden h-full flex-col border-r border-white/[0.06] p-10 lg:flex bg-[#06080C]">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#06080C] to-transparent" />
        <div className="z-10 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06]">
            <Building2 className="size-4 text-[#00D4AA]" />
          </div>
          <p className="text-lg font-semibold text-white">MeridianNode</p>
        </div>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-3">
            <p className="text-xl text-white/90 leading-relaxed">
              &ldquo;MeridianNode cut our tenant communication time by 70%.
              The AI handles leasing inquiries and maintenance requests
              so my team can focus on what matters.&rdquo;
            </p>
            <footer className="text-sm font-medium text-white/40">
              ~ Sarah Chen, Director of Operations
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* ─── Right panel — login form ─── */}
      <div className="relative flex min-h-screen flex-col justify-center p-6 sm:p-8 bg-[#06080C]">
        {/* Background glow */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 h-[600px] w-[500px] -translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,212,170,0.025)_0%,transparent_70%)]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] translate-y-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_0%,transparent_70%)]" />
        </div>

        <Link
          href="/"
          className="absolute top-6 left-6 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
        >
          <ChevronLeftIcon className="size-3.5" />
          Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-[380px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06]">
              <Building2 className="size-4 text-[#00D4AA]" />
            </div>
            <p className="text-lg font-semibold text-white">MeridianNode</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[28px] font-bold tracking-tight text-white leading-none">
              Welcome back
            </h1>
            <p className="mt-2 text-[14px] text-white/35">
              Sign in to your property management dashboard
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, y: -4, height: 0, marginBottom: 0 }}
                className="rounded-xl bg-red-500/[0.06] border border-red-500/[0.12] px-4 py-3 text-[13px] text-red-400/90 flex items-center gap-2.5 overflow-hidden"
              >
                <div className="shrink-0 size-5 rounded-full bg-red-500/15 flex items-center justify-center">
                  <span className="text-[10px] font-bold">!</span>
                </div>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-white/40 tracking-wide uppercase">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={cn(
                    'peer h-12 w-full rounded-xl border bg-white/[0.02] px-4 ps-11 text-[14px] text-white',
                    'placeholder:text-white/20 transition-all duration-200',
                    'border-white/[0.06] hover:border-white/[0.12]',
                    'focus:outline-none focus:border-[#00D4AA]/30 focus:ring-[3px] focus:ring-[#00D4AA]/[0.08] focus:bg-white/[0.03]',
                  )}
                />
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-white/20 peer-focus:text-[#00D4AA]/50 transition-colors duration-200">
                  <AtSignIcon className="size-4" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-white/40 tracking-wide uppercase">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[#00D4AA]/40 hover:text-[#00D4AA]/70 transition-colors font-medium"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={cn(
                    'peer h-12 w-full rounded-xl border bg-white/[0.02] px-4 ps-11 pe-16 text-[14px] text-white',
                    'placeholder:text-white/20 transition-all duration-200',
                    'border-white/[0.06] hover:border-white/[0.12]',
                    'focus:outline-none focus:border-[#00D4AA]/30 focus:ring-[3px] focus:ring-[#00D4AA]/[0.08] focus:bg-white/[0.03]',
                  )}
                />
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-white/20 peer-focus:text-[#00D4AA]/50 transition-colors duration-200">
                  <LockIcon className="size-4" />
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center pe-4 text-white/20 hover:text-white/45 transition-colors"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest select-none">
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'group relative h-12 w-full rounded-xl text-[14px] font-semibold transition-all duration-200 overflow-hidden',
                'bg-[#00D4AA] text-[#06080C]',
                'hover:shadow-[0_0_32px_rgba(0,212,170,0.2)] hover:bg-[#00eabb]',
                'active:scale-[0.985]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06080C]',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="inline-block size-4 border-2 border-[#06080C]/20 border-t-[#06080C] rounded-full"
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>

          {/* Signup CTA */}
          <div className="text-center">
            <p className="text-[13px] text-white/30">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-[#00D4AA] hover:text-[#00D4AA]/80 font-semibold transition-colors"
              >
                Get started free
              </Link>
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-6">
            {[
              { icon: ShieldCheck, text: '256-bit encrypted' },
              { icon: CheckCircle2, text: 'SOC 2 compliant' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-white/[0.12]">
                <Icon className="size-3" />
                <span className="text-[10px] tracking-wide">{text}</span>
              </div>
            ))}
          </div>

          <p className="mt-5 text-[10px] text-white/[0.12] text-center leading-relaxed">
            By signing in you agree to our{' '}
            <Link href="/terms" className="hover:text-white/25 underline underline-offset-[3px] transition-colors">
              Terms
            </Link>
            {' '}&{' '}
            <Link href="/privacy" className="hover:text-white/25 underline underline-offset-[3px] transition-colors">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}

/* ─── Floating Paths (unchanged) ─── */

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-white" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.04 + path.id * 0.015}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}
