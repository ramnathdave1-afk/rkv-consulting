'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, Map, Shield, TrendingUp, Zap, BarChart3, ArrowRight, Bot, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Infrastructure Scanner', desc: 'Autonomous grid scanning — discovers substations and infrastructure capacity across all US ISO regions.' },
  { icon: Map, title: 'Site Discovery', desc: 'AI parcel analysis — locates optimal parcels near infrastructure with zoning, acreage, and environmental checks.' },
  { icon: Shield, title: 'Multi-Dimension Scoring', desc: 'Composite 0-100 scores across configurable dimensions per vertical — grid, land, risk, market, and more.' },
  { icon: TrendingUp, title: 'Market Intelligence', desc: 'Regional power costs, land prices, tax incentives, and infrastructure density tracking.' },
  { icon: Cpu, title: '3D Infrastructure Map', desc: 'Full 3D Mapbox visualization with terrain, substations, environmental layers, and real-time site markers.' },
  { icon: BarChart3, title: 'Pipeline & Reports', desc: 'Kanban pipeline management with AI-powered feasibility analysis and automated PDF reports.' },
];

const steps = [
  { step: '01', title: 'Add Your Sites', description: 'Input site coordinates or let our AI agents discover optimal parcels automatically.' },
  { step: '02', title: 'Analyze & Score', description: 'Our five-dimension scoring engine evaluates grid access, land, risk, market, and connectivity.' },
  { step: '03', title: 'Act with Confidence', description: 'Get feasibility verdicts, risk assessments, and actionable recommendations backed by real data.' },
];

const verticals = [
  { name: 'Data Centers', color: '#3B82F6' },
  { name: 'Solar', color: '#F59E0B' },
  { name: 'Wind', color: '#22C55E' },
  { name: 'EV Charging', color: '#8A00FF' },
  { name: 'Industrial', color: '#EF4444' },
  { name: 'Residential', color: '#06B6D4' },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, company }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Something went wrong');
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">Meridian Node</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Pricing</Link>
            <Link href="/about" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors hidden sm:block">About</Link>
            <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
            <Link href="/signup" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,170,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-muted px-4 py-1.5 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              AI-Powered Land Intelligence
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
              Meridian Node
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
              AI-powered land infrastructure intelligence for developers, energy companies, and infrastructure investors.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition-colors">
                Start Free <ArrowRight size={14} />
              </Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-elevated transition-colors">
                View Pricing
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-10 flex items-center justify-center gap-2 flex-wrap">
            {verticals.map((v) => (
              <span key={v.name} className="rounded-full px-3 py-1 text-[10px] font-medium border border-border/50" style={{ color: v.color, borderColor: `${v.color}30` }}>
                {v.name}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="font-display text-2xl font-bold text-text-primary text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="glass-card p-6 relative">
              <span className="font-display text-3xl font-bold text-accent/15">{s.step}</span>
              <h3 className="font-display text-sm font-bold text-text-primary mt-1">{s.title}</h3>
              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="font-display text-2xl font-bold text-text-primary text-center mb-10">Platform Capabilities</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="glass-card p-5 hover:border-border-hover transition-colors">
              <f.icon className="mb-3 h-5 w-5 text-accent" />
              <h3 className="font-display text-sm font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Agents */}
      <div className="mx-auto max-w-4xl px-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-8 text-center" style={{ borderColor: 'rgba(0,212,170,0.15)' }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
            <Bot size={24} className="text-accent" />
          </div>
          <h2 className="font-display text-xl font-bold text-text-primary mb-2">6 Autonomous AI Agents</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto mb-4">
            Our agents work continuously — scanning infrastructure, discovering sites, scoring parcels, analyzing markets, and running feasibility checks.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map((agentName, i) => {
              const colors = ['#00D4AA', '#3B82F6', '#F59E0B', '#8A00FF', '#A855F7', '#06B6D4'];
              return (
                <span key={agentName} className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ color: colors[i], backgroundColor: `${colors[i]}15` }}>
                  {agentName}
                </span>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* CTA / Waitlist */}
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-md">
          {submitted ? (
            <div className="glass-card p-6 text-center">
              <CheckCircle2 size={24} className="text-accent mx-auto mb-2" />
              <div className="text-accent text-lg font-semibold mb-2">You&apos;re on the list</div>
              <p className="text-sm text-text-secondary">We&apos;ll reach out when your access is ready.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="glass-card p-6 space-y-3">
              <h2 className="text-sm font-semibold text-text-primary mb-1">Request Early Access</h2>
              {error && <div className="rounded-lg bg-danger-muted px-3 py-2 text-xs text-danger">{error}</div>}
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Work email" className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent-hover disabled:opacity-50">
                {loading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-text-primary mb-3">Product</p>
              <div className="space-y-2">
                <Link href="/pricing" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">Pricing</Link>
                <Link href="/about" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">About</Link>
                <Link href="/security" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">Security</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary mb-3">Legal</p>
              <div className="space-y-2">
                <Link href="/terms" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">Terms of Service</Link>
                <Link href="/privacy" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy Policy</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary mb-3">Support</p>
              <div className="space-y-2">
                <Link href="/contact" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">Contact Us</Link>
                <a href="mailto:hello@meridiannode.io" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">hello@meridiannode.io</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary mb-3">Account</p>
              <div className="space-y-2">
                <Link href="/login" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">Sign In</Link>
                <Link href="/signup" className="block text-xs text-text-muted hover:text-text-secondary transition-colors">Create Account</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex items-center justify-between">
            <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} MeridianNode by RKV. All rights reserved.</p>
            <p className="text-xs text-text-muted">meridiannode.io</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
