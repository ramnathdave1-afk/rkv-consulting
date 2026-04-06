'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Wrench, Bug, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      'Flexible column mapping that recognizes variations from AppFolio, Buildium, Yardi, and other PM platforms.',
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

const categoryConfig: Record<Category, { icon: React.ElementType; color: string; bg: string }> = {
  Feature: { icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  Improvement: { icon: Wrench, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  Fix: { icon: Bug, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">RKV Consulting</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Back to site
            <ArrowRight size={12} />
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="mx-auto max-w-3xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
            <Sparkles size={24} className="text-accent" />
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">Changelog</h1>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            What&apos;s new in RKV Consulting
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

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
                      'absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 border-bg-primary',
                      release.category === 'Feature'
                        ? 'bg-emerald-400'
                        : release.category === 'Improvement'
                          ? 'bg-blue-400'
                          : 'bg-amber-400'
                    )}
                  />

                  <div className="glass-card p-5">
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-accent">
                        {release.version}
                      </span>
                      <span className="text-[11px] text-text-muted">{release.date}</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                          config.bg,
                          config.color
                        )}
                      >
                        <Icon size={10} />
                        {release.category}
                      </span>
                    </div>

                    {/* Title & description */}
                    <h3 className="font-display text-sm font-bold text-text-primary mb-1">
                      {release.title}
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {release.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} RKV Consulting by RKV</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
