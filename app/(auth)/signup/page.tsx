'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Rotating Stats Data                                                */
/* ------------------------------------------------------------------ */

const stats = [
  { value: '47', description: 'hours saved per month on average' },
  { value: '94%', description: 'reduction in tenant communication time' },
  { value: '$12,400', description: 'additional annual profit identified' },
];

/* ------------------------------------------------------------------ */
/*  Avatar Circles                                                     */
/* ------------------------------------------------------------------ */

const avatars = [
  { initials: 'MT', bg: 'bg-gold' },
  { initials: 'JL', bg: 'bg-green' },
  { initials: 'DK', bg: 'bg-gold' },
];

/* ------------------------------------------------------------------ */
/*  Password Strength Calculator                                       */
/* ------------------------------------------------------------------ */

type StrengthLevel = 'Weak' | 'Fair' | 'Good' | 'Strong';

interface PasswordStrength {
  score: number;       // 0-4
  label: StrengthLevel;
  color: string;       // tailwind bg class
  textColor: string;   // tailwind text class
  percent: number;     // 0-100 width
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map: Record<number, Omit<PasswordStrength, 'score'>> = {
    0: { label: 'Weak', color: 'bg-red', textColor: 'text-red', percent: 0 },
    1: { label: 'Weak', color: 'bg-red', textColor: 'text-red', percent: 25 },
    2: { label: 'Fair', color: 'bg-warning', textColor: 'text-warning', percent: 50 },
    3: { label: 'Good', color: 'bg-gold', textColor: 'text-gold', percent: 75 },
    4: { label: 'Strong', color: 'bg-green', textColor: 'text-green', percent: 100 },
  };

  return { score, ...map[score] };
}

/* ------------------------------------------------------------------ */
/*  SignUp Page                                                        */
/* ------------------------------------------------------------------ */

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignUpPageInner />
    </Suspense>
  );
}

function SignUpPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // ---- Rotating stats state ----
  const [statIndex, setStatIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatIndex((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ---- Form state ----
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---- Field errors ----
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  // ---- Password strength ----
  const strength = password.length > 0 ? calculatePasswordStrength(password) : null;

  // ---- Validation ----
  const validate = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fullName, email, password, confirmPassword]);

  // ---- Submit ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      setLoading(false);
      if (error.message.toLowerCase().includes('email')) {
        setErrors({ email: 'This email is already registered or invalid' });
      } else if (error.message.toLowerCase().includes('password')) {
        setErrors({ password: 'Password must be at least 6 characters' });
      } else {
        setErrors({ general: 'Unable to create account. Please try again.' });
      }
      return;
    }

    const plan = searchParams.get('plan');
    if (plan) {
      router.push(`/pricing?new=true&plan=${encodeURIComponent(plan)}`);
      return;
    }
    router.push('/onboarding');
  };

  const handleGoogle = async () => {
    setErrors({});
    const plan = searchParams.get('plan');
    const next = plan ? `/pricing?new=true&plan=${encodeURIComponent(plan)}` : '/onboarding';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
          <p className="text-[18px] text-white mt-8 font-body">
            The Intelligent Real Estate Operating System
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

        {/* Middle - Rotating stats */}
        <div className="flex-1 flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={statIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <p className="text-6xl font-bold text-gold font-display">
                {stats[statIndex].value}
              </p>
              <p className="text-xl text-white/80 mt-3 font-body">
                {stats[statIndex].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom - Social proof */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            {avatars.map((a, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full ${a.bg} flex items-center justify-center text-xs font-bold text-white border-2 border-deep`}
              >
                {a.initials}
              </div>
            ))}
          </div>
          <p className="text-muted text-sm font-body">
            Trusted by <span className="text-white font-medium">3,200+</span> investors
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  RIGHT PANEL                                                  */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[55%] lg:ml-[45%] overflow-y-auto p-8 sm:p-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[var(--bg-secondary)] border border-border rounded-lg p-8">
            {/* Heading */}
            <h2 className="font-display font-bold text-3xl text-white">
              Create your account
            </h2>
            <p className="text-muted mt-2 font-body">
              Start your 14-day free trial. No credit card required.
            </p>

            {/* Google auth */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full h-10 px-4 rounded-[6px] border border-border bg-[var(--bg-primary)] text-white font-body font-semibold text-[13px] hover:border-border-hover transition-colors inline-flex items-center justify-center gap-3"
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
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
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
              {/* Password strength bar */}
              {strength && (
                <div className="mt-2.5">
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${strength.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${strength.percent}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                  <p className={`text-xs mt-1 font-body ${strength.textColor}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
              rightAdornment={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="w-8 h-8 rounded-[6px] border border-border text-muted hover:text-white hover:border-border-hover transition-colors inline-flex items-center justify-center"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          {/* Terms */}
          <p className="text-xs text-muted mt-6 font-body leading-relaxed">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-gold hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Sign in link */}
          <p className="text-sm text-muted mt-8 text-center font-body">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-gold font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
