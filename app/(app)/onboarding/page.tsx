'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, ArrowLeft, CheckCircle2, Map, BarChart3, Bot, Server, Sun, Wind, BatteryCharging, Factory, Home, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const verticalOptions = [
  { id: 'data_center', label: 'Data Centers', icon: Server, color: '#3B82F6' },
  { id: 'solar', label: 'Solar', icon: Sun, color: '#F59E0B' },
  { id: 'wind', label: 'Wind', icon: Wind, color: '#22C55E' },
  { id: 'ev_charging', label: 'EV Charging', icon: BatteryCharging, color: '#8A00FF' },
  { id: 'industrial', label: 'Industrial', icon: Factory, color: '#EF4444' },
  { id: 'residential', label: 'Residential', icon: Home, color: '#06B6D4' },
  { id: 'mixed_use', label: 'Mixed Use', icon: Building2, color: '#A855F7' },
];

const tourSlides = [
  { icon: Map, title: '3D Command Center', description: 'Explore infrastructure on our 3D Mapbox map — substations, parcels, environmental layers, all in real-time.', color: '#3B82F6' },
  { icon: Bot, title: 'AI Agent Swarm', description: '6 autonomous agents continuously scan, score, and analyze sites. They work 24/7 so you don\'t have to.', color: '#00D4AA' },
  { icon: BarChart3, title: 'Intelligent Scoring', description: 'Five-dimension composite scoring (grid, land, risk, market, connectivity) tailored per vertical.', color: '#F59E0B' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [vertical, setVertical] = useState('data_center');
  const [tourIndex, setTourIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;

  const handleComplete = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        company,
        job_title: jobTitle,
        onboarding_completed: true,
      }).eq('user_id', user.id);
    }
    router.push('/dashboard');
  };

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i <= step ? '#00D4AA' : 'rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8">
              <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Welcome to Meridian Node</h1>
              <p className="text-sm text-text-secondary mb-6">Let&apos;s set up your workspace. This takes about 30 seconds.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Company Name</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your company"
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Your Role</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Site Analyst, VP Development"
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <button onClick={next} className="w-full mt-6 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors">
                Continue <ArrowRight size={14} />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8">
              <h2 className="font-display text-xl font-bold text-text-primary mb-2">Select Your Primary Vertical</h2>
              <p className="text-sm text-text-secondary mb-6">What type of infrastructure are you developing?</p>

              <div className="grid grid-cols-2 gap-2">
                {verticalOptions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVertical(v.id)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl p-3 border transition-all text-left',
                      vertical === v.id
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-border hover:border-border-hover bg-bg-secondary/30',
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${v.color}15` }}>
                      <v.icon size={16} style={{ color: v.color }} />
                    </div>
                    <span className="text-xs font-medium text-text-primary">{v.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={prev} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors">
                  <ArrowLeft size={12} /> Back
                </button>
                <button onClick={next} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors">
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8">
              <h2 className="font-display text-xl font-bold text-text-primary mb-6">Quick Tour</h2>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tourIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-center py-6"
                >
                  {(() => {
                    const slide = tourSlides[tourIndex];
                    return (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4" style={{ backgroundColor: `${slide.color}15` }}>
                          <slide.icon size={28} style={{ color: slide.color }} />
                        </div>
                        <h3 className="font-display text-lg font-bold text-text-primary mb-2">{slide.title}</h3>
                        <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">{slide.description}</p>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-center gap-1.5 my-4">
                {tourSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTourIndex(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: tourIndex === i ? 20 : 6,
                      backgroundColor: tourIndex === i ? '#00D4AA' : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={prev} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors">
                  <ArrowLeft size={12} /> Back
                </button>
                <button
                  onClick={() => {
                    if (tourIndex < tourSlides.length - 1) {
                      setTourIndex(tourIndex + 1);
                    } else {
                      next();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
                >
                  {tourIndex < tourSlides.length - 1 ? 'Next' : 'Continue'} <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
                <CheckCircle2 size={28} className="text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary mb-2">You&apos;re All Set</h2>
              <p className="text-sm text-text-secondary mb-6">
                Your workspace is configured for {verticalOptions.find((v) => v.id === vertical)?.label || 'your vertical'}. Start exploring.
              </p>

              <div className="flex gap-2">
                <button onClick={prev} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors">
                  <ArrowLeft size={12} /> Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {saving ? 'Setting up...' : 'Enter Dashboard'} <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
