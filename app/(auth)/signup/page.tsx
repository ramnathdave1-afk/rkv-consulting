'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
  { initials: 'DK', bg: 'bg-[#6366F1]' },
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
    2: { label: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-500', percent: 50 },
    3: { label: 'Good', color: 'bg-gold', textColor: 'text-gold', percent: 75 },
    4: { label: 'Strong', color: 'bg-green', textColor: 'text-green', percent: 100 },
  };

  return { score, ...map[score] };
}

/* ------------------------------------------------------------------ */
/*  SignUp Page                                                        */
/* ------------------------------------------------------------------ */

export default function SignUpPage() {
  const router = useRouter();
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
        setErrors({ email: error.message });
      } else if (error.message.toLowerCase().includes('password')) {
        setErrors({ password: error.message });
      } else {
        setErrors({ general: error.message });
      }
      return;
    }

    router.push('/pricing?new=true');
  };

  // ---- Render ----
  return (
    <div className="min-h-screen flex bg-black">
      {/* ============================================================ */}
      {/*  LEFT PANEL                                                   */}
      {/* ============================================================ */}
      <div className="hidden lg:flex w-[45%] fixed inset-y-0 left-0 bg-deep p-12 flex-col justify-between">
        {/* Top */}
        <div>
          <h1 className="font-display font-bold text-2xl text-gold">
            RKV Consulting
          </h1>
          <p className="text-lg text-white mt-2 font-body">
            The Intelligent Real Estate Operating System
          </p>
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
                className={`w-10 h-10 rounded-full ${a.bg} flex items-center justify-center text-xs font-bold text-black border-2 border-deep`}
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
          {/* Heading */}
          <h2 className="font-display font-bold text-3xl text-white">
            Create your account
          </h2>
          <p className="text-muted mt-2 font-body">
            Start your 14-day free trial. No credit card required.
          </p>

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
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoComplete="new-password"
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
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
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
  );
}
