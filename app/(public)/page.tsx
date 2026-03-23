'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, Wrench, BarChart3, ArrowRight, CheckCircle2, Building2, Shield, TrendingUp, CreditCard, Home, FileText, Users, Sparkles } from 'lucide-react';
import { BackgroundPaths } from '@/components/ui/background-paths';
import InteractiveBentoGallery from '@/components/ui/interactive-bento-gallery';
import { Features8 } from '@/components/blocks/features-8';
import { Features9 } from '@/components/blocks/features-9';

const propertyImages = [
  { id: 1, type: 'image', title: 'Modern Apartment Complex', desc: 'Multi-unit residential, 48 units, Scottsdale AZ', url: '/images/property-apartments.jpg', span: 'md:col-span-2 md:row-span-3 sm:col-span-2 sm:row-span-2' },
  { id: 2, type: 'image', title: 'Luxury Townhouses', desc: 'Townhome row, 12 units, Phoenix AZ', url: '/images/townhouses-real.jpg', span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2' },
  { id: 3, type: 'image', title: 'Mid-Rise Residential', desc: 'Urban mixed-use, 96 units, Tempe AZ', url: '/images/property-midrise.jpg', span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2' },
  { id: 4, type: 'image', title: 'Property at Twilight', desc: 'Luxury building exterior, warm lighting', url: '/images/building-twilight.jpg', span: 'md:col-span-2 md:row-span-2 sm:col-span-2 sm:row-span-2' },
  { id: 5, type: 'image', title: 'Aerial Portfolio View', desc: 'Drone view of managed properties', url: '/images/aerial-real.jpg', span: 'md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2' },
  { id: 6, type: 'image', title: 'Upscale Duplex', desc: 'Modern duplex, 2 units, Mesa AZ', url: '/images/property-duplex.jpg', span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2' },
  { id: 7, type: 'image', title: 'Building Lobby', desc: 'Premium interior finishes', url: '/images/lobby.jpg', span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2' },
];

const features = [
  { icon: MessageSquare, title: 'AI Tenant Communication', desc: '24/7 responses via SMS, email, and web chat. Leads qualified, showings scheduled — all under 90 seconds.' },
  { icon: CreditCard, title: 'Automated Rent Collection', desc: 'Smart reminders, delinquency aging (0-30, 30-60, 60-90), and automated follow-up sequences.' },
  { icon: Wrench, title: 'Maintenance AI Triage', desc: 'AI classifies urgency P1-P4, matches vendors by skill and proximity, auto-dispatches within 2hr SLA.' },
  { icon: FileText, title: 'Lease Management', desc: 'Automated 90/60/30-day renewal sequences. Track expirations and reduce vacancy gaps.' },
  { icon: TrendingUp, title: 'Portfolio Analytics', desc: 'Real-time dashboards, AI-generated owner PDF reports, variance alerts, and NOI tracking.' },
  { icon: Home, title: 'Vacancy Management', desc: 'Automated listing syndication, lead tracking, and showing scheduling. Fill units faster.' },
  { icon: Building2, title: 'Acquisitions CRM', desc: 'Deal pipeline kanban, multi-agent AI scoring (ARV + Market + Risk), MAO calculator.' },
  { icon: Shield, title: 'Fair Housing Compliance', desc: 'Every AI message passes through compliance filters before sending. Full audit log.' },
];

const steps = [
  { num: '01', title: 'Connect Your Properties', desc: 'Import via CSV or connect AppFolio, Buildium, Yardi. Properties, units, and leases sync automatically.' },
  { num: '02', title: 'AI Starts Working', desc: 'Our AI handles tenant communications, triages maintenance, and generates reports — immediately.' },
  { num: '03', title: 'Run Like a 20-Person Team', desc: 'Your 5-person team operates at 4x capacity. Owner reports generate themselves. Work orders close faster.' },
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
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
              <span className="text-xs font-bold text-black">M</span>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">MeridianNode</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="#features" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors hidden sm:block">Features</Link>
            <Link href="#gallery" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors hidden sm:block">Portfolio</Link>
            <Link href="/login" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero with Background Paths */}
      <BackgroundPaths title="MeridianNode" />

      {/* Stats Band */}
      <div className="border-y border-white/5">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4">
          {[
            { value: '2,400+', label: 'Units Managed' },
            { value: '<90s', label: 'AI Response Time' },
            { value: '98%', label: 'Tenant Satisfaction' },
            { value: '$14.2M', label: 'Rent Collected' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center py-10 px-4 border-r border-white/5 last:border-r-0">
              <div className="text-3xl font-bold text-white tracking-tight">{stat.value}</div>
              <div className="text-xs text-neutral-500 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-400 mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Platform Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Everything your portfolio needs</h2>
            <p className="text-neutral-500 max-w-xl mx-auto">Eight modules powered by AI. Each one replaces hours of manual work every week.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="group p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-default">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white group-hover:-translate-y-1 transition-all duration-200">
                  <f.icon className="w-4 h-4 text-neutral-500 group-hover:text-black transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento (Features-8 component) */}
      <Features8 />

      {/* Automation Showcase — Map, Chat, Analytics */}
      <Features9 />

      {/* How It Works */}
      <section className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Up and running in 3 steps</h2>
            <p className="text-neutral-500">No engineering required. Most teams go live in 48 hours.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="relative p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-4xl font-bold text-white/5">{s.num}</span>
                <h3 className="text-sm font-semibold text-white mt-2 mb-2">{s.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Property Gallery */}
      <section id="gallery" className="py-16 border-t border-white/5">
        <InteractiveBentoGallery
          mediaItems={propertyImages}
          title="Properties We Manage"
          description="Drag and explore properties across our managed portfolio"
        />
      </section>

      {/* Social Proof */}
      <section className="py-24 border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-12">Trusted by serious operators</h2>
            <blockquote className="text-xl md:text-2xl font-light text-neutral-400 italic leading-relaxed mb-8">
              &ldquo;We cut our response time from 12 hours to under 90 seconds. Tenants actually think they&apos;re talking to a real person. Our retention went up 18% in the first quarter.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-neutral-400">SR</div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">Sarah Rodriguez</div>
                <div className="text-xs text-neutral-500">Ops Director · 200 units · Scottsdale, AZ</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA / Waitlist */}
      <section className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-md px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">Ready to scale your portfolio?</h2>
            <p className="text-neutral-500 text-sm">Join the waitlist. We&apos;ll set up a sandbox with your actual property data.</p>
          </motion.div>
          {submitted ? (
            <div className="rounded-xl border border-white/5 p-6 text-center bg-white/[0.02]">
              <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
              <div className="text-emerald-400 text-lg font-semibold mb-2">You&apos;re on the list</div>
              <p className="text-sm text-neutral-500">We&apos;ll reach out when your access is ready.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="rounded-xl border border-white/5 p-6 space-y-3 bg-white/[0.02]">
              {error && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-white/20 focus:outline-none transition-colors" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Work email" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-white/20 focus:outline-none transition-colors" />
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:border-white/20 focus:outline-none transition-colors" />
              <button type="submit" disabled={loading} className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-white mb-3">Product</p>
              <div className="space-y-2">
                <Link href="#features" className="block text-xs text-neutral-500 hover:text-white transition-colors">Features</Link>
                <Link href="#gallery" className="block text-xs text-neutral-500 hover:text-white transition-colors">Portfolio</Link>
                <Link href="/about" className="block text-xs text-neutral-500 hover:text-white transition-colors">About</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Legal</p>
              <div className="space-y-2">
                <Link href="/terms" className="block text-xs text-neutral-500 hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="block text-xs text-neutral-500 hover:text-white transition-colors">Privacy</Link>
                <Link href="/security" className="block text-xs text-neutral-500 hover:text-white transition-colors">Security</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Support</p>
              <div className="space-y-2">
                <Link href="/contact" className="block text-xs text-neutral-500 hover:text-white transition-colors">Contact</Link>
                <a href="mailto:hello@meridiannode.io" className="block text-xs text-neutral-500 hover:text-white transition-colors">hello@meridiannode.io</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3">Account</p>
              <div className="space-y-2">
                <Link href="/login" className="block text-xs text-neutral-500 hover:text-white transition-colors">Sign In</Link>
                <Link href="/signup" className="block text-xs text-neutral-500 hover:text-white transition-colors">Create Account</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex items-center justify-between">
            <p className="text-xs text-neutral-500">&copy; {new Date().getFullYear()} MeridianNode by RKV Consulting LLC</p>
            <p className="text-xs text-neutral-500">meridiannode.io</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
