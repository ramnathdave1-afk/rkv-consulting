'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Wrench, Bug, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/landing/StatusBadge';

type Category = 'Feature' | 'Improvement' | 'Fix';

interface Release {
  version: string;
  date: string;
  category: Category;
  title: string;
  description: string;
}

const releases: Release[] = [
  {
    version: 'v2.4.0',
    date: 'April 2026',
    category: 'Feature',
    title: 'Multi-Agent Deal Scoring',
    description:
      'Three AI agents independently evaluate acquisition opportunities. Chief Agent produces a weighted final score with risk factors.',
  },
  {
    version: 'v2.3.0',
    date: 'March 2026',
    category: 'Feature',
    title: 'Voice AI Campaigns',
    description:
      'Outbound voice campaigns for rent reminders, lease renewals, and showing confirmations. Automated 3-tier escalation.',
  },
  {
    version: 'v2.2.1',
    date: 'March 2026',
    category: 'Fix',
    title: 'Lease Audit Scanner',
    description:
      'Fixed false positives on month-to-month leases being flagged as expired. Improved below-market rent detection.',
  },
  {
    version: 'v2.2.0',
    date: 'February 2026',
    category: 'Feature',
    title: 'Field Operations',
    description:
      'Mobile-first field ops module with GPS check-ins, photo uploads, and real-time status updates for property inspections.',
  },
  {
    version: 'v2.1.0',
    date: 'February 2026',
    category: 'Improvement',
    title: 'Fair Housing Compliance v2',
    description:
      'Enhanced compliance filters now check for steering language, protected class references, and discriminatory patterns across all AI responses.',
  },
  {
    version: 'v2.0.0',
    date: 'January 2026',
    category: 'Feature',
    title: 'Platform Launch',
    description:
      'Full platform release with 5 AI agents, 28 pages, 102 API routes. Dashboard, properties, tenants, leases, work orders, voice AI, campaigns, reports, and acquisitions.',
  },
  {
    version: 'v1.5.0',
    date: 'December 2025',
    category: 'Feature',
    title: 'AI Owner Reports',
    description:
      'Claude-powered executive summaries generated automatically for property owners. Branded PDF export.',
  },
  {
    version: 'v1.4.0',
    date: 'November 2025',
    category: 'Feature',
    title: 'Delinquency Engine',
    description:
      '3-tier automated collection system with SMS, email, and voice reminders. Recovered $47K in first 60 days of pilot.',
  },
  {
    version: 'v1.3.0',
    date: 'October 2025',
    category: 'Improvement',
    title: 'CSV Import v2',
    description:
      'Flexible column mapping that recognizes the export formats from most major PM platforms.',
  },
  {
    version: 'v1.2.0',
    date: 'September 2025',
    category: 'Feature',
    title: 'Voice AI Launch',
    description:
      '24/7 AI phone system powered by Twilio and Claude. Natural conversation, 17 knowledge base entries, de-escalation built in.',
  },
];

const categoryConfig: Record<Category, { icon: React.ElementType; pill: string; dot: string }> = {
  Feature: {
    icon: Sparkles,
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Improvement: {
    icon: Wrench,
    pill: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  Fix: {
    icon: Bug,
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0F172A]">
              <span className="text-xs font-bold text-white">R</span>
            </div>
            <span className="font-display text-sm font-bold text-[#0F172A]">RKV Consulting</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
          >
            Back to site
            <ArrowRight size={12} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#0369A1]/10 mx-auto mb-5">
              <Sparkles size={24} className="text-[#0369A1]" />
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight text-[#020617]">Changelog</h1>
            <p className="mt-5 text-xl md:text-2xl text-[#475569] max-w-md mx-auto">
              What&apos;s new in RKV Consulting
            </p>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-3xl px-6 py-20 md:py-32">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />

          <div className="space-y-10">
            {releases.map((release, i) => {
              const config = categoryConfig[release.category];
              const Icon = config.icon;

              return (
                <motion.div
                  key={release.version}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="relative pl-8"
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute left-0 top-2 h-[15px] w-[15px] rounded-full border-2 border-[#F8FAFC]',
                      config.dot
                    )}
                  />

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-mono font-semibold text-[#0F172A]">
                        {release.version}
                      </span>
                      <span className="text-xs text-[#475569]">{release.date}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                          config.pill
                        )}
                      >
                        <Icon size={11} />
                        {release.category}
                      </span>
                    </div>

                    {/* Title & description */}
                    <h3 className="font-display text-lg font-bold text-[#0F172A] mb-1.5">
                      {release.title}
                    </h3>
                    <p className="text-sm text-[#475569]" style={{ lineHeight: 1.7 }}>
                      {release.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#475569]">&copy; {new Date().getFullYear()} RKV Consulting by RKV</p>
          <div className="flex items-center gap-4">
            <StatusBadge />
            <Link href="/terms" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Terms</Link>
            <Link href="/privacy" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
