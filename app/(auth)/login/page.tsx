'use client';

import React, { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AtSignIcon, ChevronLeftIcon, LockIcon, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  return <Suspense><AuthPageLogin /></Suspense>;
}

function AuthPageLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      {/* Left panel — floating paths + branding */}
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

      {/* Right panel — login form */}
      <div className="relative flex min-h-screen flex-col justify-center p-4 bg-[#06080C]">
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-40"
        >
          <div className="absolute top-0 right-0 h-[500px] w-[400px] -translate-y-1/2 rounded-full bg-[radial-gradient(68%_69%_at_55%_31%,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.01)_50%,rgba(255,255,255,0.005)_80%)]" />
          <div className="absolute top-0 right-0 h-[500px] w-[200px] -translate-y-1/2 translate-x-[5%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.005)_80%,transparent_100%)]" />
        </div>

        <Link
          href="/"
          className="absolute top-7 left-5 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
        >
          <ChevronLeftIcon className="size-4" />
          Home
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06]">
              <Building2 className="size-4 text-[#00D4AA]" />
            </div>
            <p className="text-lg font-semibold text-white">MeridianNode</p>
          </div>

          <div className="flex flex-col space-y-1.5">
            <h1 className="text-2xl font-bold tracking-wide text-white">
              Sign in to MeridianNode
            </h1>
            <p className="text-sm text-white/40">
              AI-powered property management infrastructure
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/50">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="peer h-10 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 ps-9 text-sm text-white placeholder:text-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA]/30 focus-visible:border-[#00D4AA]/40 transition-colors"
                />
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-white/30 peer-focus-visible:text-[#00D4AA]/60">
                  <AtSignIcon className="size-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/50">Password</label>
                <Link href="/forgot-password" className="text-xs text-white/30 hover:text-[#00D4AA] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="peer h-10 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 ps-9 text-sm text-white placeholder:text-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA]/30 focus-visible:border-[#00D4AA]/40 transition-colors"
                />
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-white/30 peer-focus-visible:text-[#00D4AA]/60">
                  <LockIcon className="size-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold transition-all',
                'bg-[#00D4AA] text-[#06080C] hover:bg-[#00D4AA]/90 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA]/50',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <AuthSeparator />

          <div className="text-center">
            <p className="text-sm text-white/40">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#00D4AA] hover:text-[#00D4AA]/80 font-medium transition-colors">
                Get started
              </Link>
            </p>
          </div>

          <p className="text-xs text-white/20 text-center pt-2">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="hover:text-white/40 underline underline-offset-4 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="hover:text-white/40 underline underline-offset-4 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

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
      <svg
        className="h-full w-full text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
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

function AuthSeparator() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="h-px w-full bg-white/[0.06]" />
      <span className="px-3 text-xs text-white/20">OR</span>
      <div className="h-px w-full bg-white/[0.06]" />
    </div>
  );
}
