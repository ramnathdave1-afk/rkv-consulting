'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
        setErrors({ email: error.message });
      } else if (error.message.toLowerCase().includes('password') || error.message.toLowerCase().includes('credentials')) {
        setErrors({ general: 'Invalid email or password. Please try again.' });
      } else {
        setErrors({ general: error.message });
      }
      return;
    }

    router.push('/dashboard');
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
          <p className="font-display font-bold text-3xl text-white mt-6">
            Welcome back
          </p>
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
        <div className="h-px bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
      </div>

      {/* ============================================================ */}
      {/*  RIGHT PANEL                                                  */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[55%] lg:ml-[45%] overflow-y-auto p-8 sm:p-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md mx-auto">
          {/* Heading */}
          <h2 className="font-display font-bold text-3xl text-white">
            Sign in to your account
          </h2>
          <p className="text-muted mt-2 font-body">
            Enter your credentials to access your dashboard.
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
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
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
  );
}
