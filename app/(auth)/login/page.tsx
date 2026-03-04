'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Testimonials Data                                                  */
/* ------------------------------------------------------------------ */

const testimonials = [
  {
    quote:
      'I used to spend 3 hours every Monday on rent follow-ups. RKV handles all of it. My VA called confused about why there was nothing to do.',
    author: 'Marcus T.',
    units: '14 units',
  },
  {
    quote:
      'Our vacancy rate dropped from 18% to 4% in 60 days. The AI agent filled units while I was on vacation.',
    author: 'Jennifer L.',
    units: '31 units',
  },
  {
    quote:
      'I found $23,000 in missed deductions my CPA didn\'t catch. The accounting center paid for itself 10 times over.',
    author: 'David K.',
    units: '8 units',
  },
];

/* ------------------------------------------------------------------ */
/*  Login Page                                                         */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // ---- Rotating testimonials state ----
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ---- Form state ----
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---- Errors ----
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  // ---- Validation ----
  const validate = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes('email')) {
        setErrors({ email: 'Invalid email address' });
      } else if (error.message.toLowerCase().includes('password') || error.message.toLowerCase().includes('credentials')) {
        setErrors({ general: 'Invalid email or password. Please try again.' });
      } else {
        setErrors({ general: 'Unable to sign in. Please try again.' });
      }
      return;
    }

    router.push('/dashboard');
  };

  const handleGoogle = async () => {
    setErrors({});
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
      },
    });
  };

  // ---- Render ----
  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)]">
      {/* ============================================================ */}
      {/*  LEFT PANEL                                                   */}
      {/* ============================================================ */}
      <div className="hidden lg:flex w-[45%] fixed inset-y-0 left-0 bg-deep p-12 flex-col justify-between">
        {/* Top */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-display font-extrabold text-[20px] text-white tracking-tight">RKV</span>
            <div className="w-px h-5 bg-border" />
            <span className="font-body font-normal text-[11px] text-white/90 uppercase tracking-[0.25em]">
              CONSULTING
            </span>
          </div>
          <p className="mt-2 font-body text-[11px] text-muted-deep">
            Portfolio Intelligence Platform
          </p>

          <p className="font-display font-bold text-3xl text-white mt-8">
            Welcome back
          </p>

          <ul className="mt-6 space-y-3">
            {[
              'Analyze deals in 60 seconds',
              'AI collects late rent for you',
              'Replaces $1,000/month of other tools',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-[14px] font-body text-muted leading-[1.7]">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gold flex-shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Middle - Rotating testimonials */}
        <div className="flex-1 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-lg"
            >
              <blockquote className="text-white/90 text-lg leading-relaxed font-body italic">
                &ldquo;{testimonials[testimonialIndex].quote}&rdquo;
              </blockquote>
              <p className="mt-4 text-muted font-body text-sm">
                &mdash; {testimonials[testimonialIndex].author},{' '}
                {testimonials[testimonialIndex].units}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom - decorative line */}
        <div className="h-px bg-border" />
      </div>

      {/* ============================================================ */}
      {/*  RIGHT PANEL                                                  */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[55%] lg:ml-[45%] overflow-y-auto p-8 sm:p-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[var(--bg-secondary)] border border-border rounded-lg p-8">
            {/* Heading */}
            <h2 className="font-display font-bold text-3xl text-white">
              Sign in to your account
            </h2>
            <p className="text-muted mt-2 font-body">
              Enter your credentials to access your dashboard.
            </p>

          {/* Google auth */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full h-10 px-4 rounded-[6px] border border-border bg-[var(--bg-secondary)] text-white font-body font-semibold text-[13px] hover:border-border-hover transition-colors inline-flex items-center justify-center gap-3"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.1C29.3 36 26.8 36.8 24 36c-5.3 0-9.8-3.4-11.4-8.1l-6.6 5.1C9.3 39.6 16.1 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.4 5.3-6.3 6.7l6.2 5.1C39.2 36.1 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                </svg>
              </span>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-border" />
              <div className="text-[11px] font-body font-medium uppercase tracking-[0.08em] text-muted">
                Or continue with email
              </div>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          {/* General error */}
          {errors.general && (
            <div className="mt-6 p-3 rounded-lg bg-red/10 border border-red/20">
              <p className="text-sm text-red font-body">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              rightAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="w-8 h-8 rounded-[6px] border border-border text-muted hover:text-white hover:border-border-hover transition-colors inline-flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          {/* Forgot password */}
          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-gold hover:underline font-body"
            >
              Forgot password?
            </Link>
          </div>

            {/* Sign up link */}
            <p className="text-sm text-muted mt-8 text-center font-body">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-gold font-medium hover:underline"
              >
                Get started
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
