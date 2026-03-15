'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Map, Shield, TrendingUp, Zap, BarChart3 } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Infrastructure Scanner', desc: 'Autonomous grid scanning — discovers substations and infrastructure capacity across all US ISO regions.' },
  { icon: Map, title: 'Site Discovery', desc: 'AI parcel analysis — locates optimal parcels near infrastructure with zoning, acreage, and environmental checks.' },
  { icon: Shield, title: 'Multi-Dimension Scoring', desc: 'Composite 0-100 scores across configurable dimensions per vertical — grid, land, risk, market, and more.' },
  { icon: TrendingUp, title: 'Market Intelligence', desc: 'Regional power costs, land prices, tax incentives, and infrastructure density tracking.' },
  { icon: Cpu, title: '3D Infrastructure Map', desc: 'Full 3D Mapbox visualization with terrain, substations, environmental layers, and real-time site markers.' },
  { icon: BarChart3, title: 'Pipeline & Reports', desc: 'Kanban pipeline management with AI-powered feasibility analysis and automated PDF reports.' },
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
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,170,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
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
          </motion.div>

          {/* Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-10 max-w-md"
          >
            {submitted ? (
              <div className="glass-card p-6">
                <div className="text-accent text-lg font-semibold mb-2">You&apos;re on the list</div>
                <p className="text-sm text-text-secondary">
                  We&apos;ll reach out when your access is ready.
                </p>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="glass-card p-6 space-y-3">
                <h2 className="text-sm font-semibold text-text-primary mb-1">Request Early Access</h2>
                {error && (
                  <div className="rounded-lg bg-danger-muted px-3 py-2 text-xs text-danger">{error}</div>
                )}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Full name"
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Work email"
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company (optional)"
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg-primary transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {loading ? 'Joining...' : 'Join Waitlist'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              className="glass-card p-5 hover:border-border-hover transition-colors"
            >
              <f.icon className="mb-3 h-5 w-5 text-accent" />
              <h3 className="font-display text-sm font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} MeridianNode by RKV. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">meridiannode.io</p>
        </div>
      </footer>
    </div>
  );
}
