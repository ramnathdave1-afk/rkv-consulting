'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, Wrench, BarChart3, ArrowRight, Bot, CheckCircle2, Building2, FileText, Users, Clock, Shield, Zap } from 'lucide-react';
import { GlowyWavesHero } from '@/components/ui/GlowyWavesHero';

const modules = [
  { icon: MessageSquare, title: 'AI Leasing Agent', desc: 'Automated SMS, email, and web responses. Qualify leads, schedule showings, and handle lease renewals — 24/7 with <90s response times.' },
  { icon: Wrench, title: 'Maintenance Coordination', desc: 'AI triage classifies urgency, matches vendors by category and proximity, auto-dispatches, and keeps tenants updated at every stage.' },
  { icon: BarChart3, title: 'Financial Reporting', desc: 'Real-time portfolio dashboards with automated owner reports. Track occupancy, NOI, delinquency, and maintenance spend per property.' },
  { icon: Building2, title: 'Portfolio Management', desc: 'Manage all your properties, units, tenants, and leases in one place. Sync data from AppFolio, Buildium, or Yardi.' },
  { icon: Shield, title: 'Fair Housing Compliant', desc: 'Every AI message is screened through our compliance filter before delivery. Full audit log on every tenant interaction.' },
  { icon: Zap, title: 'PM Platform Integrations', desc: 'Connect your AppFolio or Buildium account and sync properties, units, tenants, leases, and work orders automatically.' },
];

const steps = [
  { step: '01', title: 'Connect Your PM Platform', description: 'Link your AppFolio or Buildium account. We sync your properties, units, tenants, and leases in minutes.' },
  { step: '02', title: 'AI Starts Working', description: 'Our AI leasing agent handles inbound inquiries. Maintenance requests are triaged and dispatched automatically.' },
  { step: '03', title: 'Run Like a 20-Person Team', description: 'Your 5-person team operates at 4x capacity. Owner reports generate themselves. Work orders close faster.' },
];

const personas = [
  { name: 'Ops Directors', desc: '70% reduction in staff communication time', icon: Users },
  { name: 'Property Owners', desc: 'Automated monthly reports delivered on schedule', icon: FileText },
  { name: 'Maintenance Teams', desc: '80% reduction in triage time with AI dispatch', icon: Wrench },
  { name: 'Leasing Teams', desc: '<90 second response to every prospect, 24/7', icon: Clock },
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
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-bg-secondary/30 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">MeridianNode</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors hidden sm:block">About</Link>
            <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
            <Link href="/signup" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero with Glowy Waves */}
      <GlowyWavesHero
        badge="AI-Powered Property Management"
        title={
          <>
            Your 5-person team,{' '}
            <span className="bg-gradient-to-r from-accent via-accent/60 to-text-primary/80 bg-clip-text text-transparent">
              running like 20
            </span>
          </>
        }
        subtitle="MeridianNode gives mid-size property management companies plug-in AI infrastructure for leasing, maintenance, reporting, and operations."
        primaryCTA={{ label: 'Get Started', href: '/signup' }}
        secondaryCTA={{ label: 'See How It Works', href: '#how-it-works' }}
        pills={['AI Leasing Agent', 'Maintenance Dispatch', 'Owner Reports', 'PM Integrations']}
        stats={[
          { label: 'Response time', value: '<90s' },
          { label: 'Communication reduction', value: '70%' },
          { label: 'Triage time saved', value: '80%' },
        ]}
      />

      {/* Who It's For */}
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-display text-2xl font-bold text-text-primary text-center mb-3">Built for PM Teams That Do More With Less</h2>
        <p className="text-sm text-text-secondary text-center max-w-2xl mx-auto mb-10">
          Companies managing 50–500 units across residential and mixed-use properties. Small teams, big portfolios, zero AI expertise required.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {personas.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="glass-card p-5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 mx-auto mb-3">
                <p.icon size={20} className="text-accent" />
              </div>
              <h3 className="font-display text-sm font-semibold text-text-primary">{p.name}</h3>
              <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="mx-auto max-w-5xl px-6 pb-20">
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

      {/* Modules Grid */}
      <div className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="font-display text-2xl font-bold text-text-primary text-center mb-10">Platform Capabilities</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className="glass-card p-5 hover:border-border-hover transition-colors">
              <f.icon className="mb-3 h-5 w-5 text-accent" />
              <h3 className="font-display text-sm font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* AI Section */}
      <div className="mx-auto max-w-4xl px-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card p-8 text-center" style={{ borderColor: 'rgba(0,212,170,0.15)' }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
            <Bot size={24} className="text-accent" />
          </div>
          <h2 className="font-display text-xl font-bold text-text-primary mb-2">AI That Works Out of the Box</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto mb-4">
            No engineers needed. MeridianNode&apos;s AI handles tenant communications, triages maintenance requests, and generates reports — all with fair housing compliance built in.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {['Leasing AI', 'Maintenance Triage', 'Compliance Filter', 'Report Generation', 'Vendor Dispatch'].map((label, i) => {
              const colors = ['#00D4AA', '#3B82F6', '#F59E0B', '#8A00FF', '#22C55E'];
              return (
                <span key={label} className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ color: colors[i], backgroundColor: `${colors[i]}15` }}>
                  {label}
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
            <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} MeridianNode by RKV Consulting LLC. All rights reserved.</p>
            <p className="text-xs text-text-muted">meridiannode.io</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
