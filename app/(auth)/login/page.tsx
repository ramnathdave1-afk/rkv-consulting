'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const GenerativeMountainScene = dynamic(
  () => import('@/components/ui/mountain-scene').then((mod) => mod.GenerativeMountainScene),
  { ssr: false }
);

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      {/* Mountain scene background */}
      <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
        <GenerativeMountainScene />
      </Suspense>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Login form */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-sm font-bold text-white">
              M
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            MeridianNode
          </h1>
          <p className="mt-1.5 text-sm text-white/50">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl p-6 space-y-4 shadow-2xl">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="flex items-center justify-between text-xs text-white/40">
            <Link href="/forgot-password" className="hover:text-white/70 transition-colors">
              Forgot password?
            </Link>
            <Link href="/signup" className="hover:text-white/70 transition-colors">
              Create account
            </Link>
          </div>
        </form>

        <p className="mt-6 text-center text-[10px] text-white/20">
          MeridianNode by RKV Consulting LLC
        </p>
      </div>
    </div>
  );
}
