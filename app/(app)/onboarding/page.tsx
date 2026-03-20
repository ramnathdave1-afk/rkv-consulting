'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Building2, MessageSquare, Wrench, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const tourSlides = [
  {
    title: 'Manage Your Portfolio',
    description: 'Add your properties, units, tenants, and leases — or connect your PM platform to import everything automatically.',
    icon: Building2,
    color: '#00D4AA',
  },
  {
    title: 'AI Leasing Agent',
    description: 'Your AI handles inbound SMS and email from prospects — qualifying leads, answering questions, and scheduling showings 24/7.',
    icon: MessageSquare,
    color: '#3B82F6',
  },
  {
    title: 'Maintenance Coordination',
    description: 'Tenants text a maintenance request, AI triages urgency, matches a vendor, and dispatches automatically.',
    icon: Wrench,
    color: '#F59E0B',
  },
  {
    title: 'Reports & Analytics',
    description: 'Real-time dashboards for occupancy, revenue, and maintenance costs. One-click owner reports delivered on schedule.',
    icon: BarChart3,
    color: '#8A00FF',
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const isLast = step === tourSlides.length - 1;

  function handleNext() {
    if (isLast) {
      router.push('/dashboard');
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleSkip() {
    router.push('/dashboard');
  }

  const slide = tourSlides[step];

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {tourSlides.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-accent' : 'bg-border',
              )}
            />
          ))}
        </div>

        {/* Slide */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8 text-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-6"
              style={{ backgroundColor: `${slide.color}15` }}
            >
              <slide.icon size={32} style={{ color: slide.color }} />
            </div>
            <h2 className="font-display text-xl font-bold text-text-primary mb-3">{slide.title}</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{slide.description}</p>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <button onClick={handleSkip} className="text-xs text-text-muted hover:text-text-primary transition-colors">
            Skip Tour
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
          >
            {isLast ? (
              <>
                <CheckCircle2 size={14} />
                Go to Dashboard
              </>
            ) : (
              <>
                Next
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
