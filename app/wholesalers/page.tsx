'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ================================================================== */
/*  ANIMATION VARIANTS                                                 */
/* ================================================================== */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: 'easeOut' as const },
  }),
}

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const childFade = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

/* ================================================================== */
/*  DATA                                                               */
/* ================================================================== */

const howItWorks = [
  {
    step: '01',
    title: 'Submit Your Deal',
    description:
      'Enter property details and our AI instantly scores your deal based on market data.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Investors See It',
    description:
      'Qualified investors in your target market get notified of matching deals.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Close the Deal',
    description:
      'Connect directly with interested investors. No middlemen, no fees.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const benefits = [
  {
    title: 'Instant AI Scoring',
    description:
      'Your deal gets scored 1-10 based on comparable sales, rent data, and market conditions.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    title: 'Verified Investors',
    description:
      'All investors on our platform are verified and actively buying.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Real-time Analytics',
    description:
      'See how many investors viewed, saved, and analyzed your deal.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: 'Zero Fees',
    description:
      'Submitting deals is completely free. We only charge investors.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
]

const stats = [
  { value: '500+', label: 'Active Investors' },
  { value: '2,400+', label: 'Deals Listed' },
  { value: '85%', label: 'Close Rate on Matched Deals' },
  { value: '$120M+', label: 'Total Deal Volume' },
]

/* ================================================================== */
/*  WHOLESALERS PAGE                                                   */
/* ================================================================== */

export default function WholesalersPage() {
  return (
    <div className="min-h-screen bg-black font-body">
      {/* ============================================================ */}
      {/*  NAV BAR                                                      */}
      {/* ============================================================ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-display font-extrabold text-base text-white tracking-tight">RKV</span>
            <div className="w-px h-4 bg-border" />
            <span className="font-body text-[11px] text-muted uppercase tracking-[0.18em]">Consulting</span>
          </Link>
          <Link
            href="/submit-deal"
            className="px-4 py-2 rounded-lg bg-gold text-black text-xs font-display font-semibold tracking-wide hover:brightness-110 transition-all"
          >
            Submit a Deal
          </Link>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(14,165,233,0.04) 0%, transparent 50%)',
          }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 blueprint-grid opacity-[0.03] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.p
            className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-6"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            For Wholesalers
          </motion.p>

          <motion.h1
            className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-white leading-tight"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0.1}
          >
            Reach Verified Real Estate Investors
          </motion.h1>

          <motion.p
            className="text-muted text-lg sm:text-xl mt-6 max-w-2xl mx-auto font-body leading-relaxed"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0.2}
          >
            Submit your wholesale deals to our network of active buyers. Get instant AI scoring,
            track investor interest, and close deals faster.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0.3}
          >
            <Link
              href="/submit-deal"
              className={cn(
                'px-8 py-3.5 rounded-xl font-display font-semibold text-sm tracking-wide',
                'bg-gold text-black hover:brightness-110 transition-all duration-200',
              )}
              style={{ boxShadow: '0 0 30px rgba(201,168,76,0.25)' }}
            >
              Submit a Deal
            </Link>
            <a
              href="#how-it-works"
              className={cn(
                'px-8 py-3.5 rounded-xl font-display font-semibold text-sm tracking-wide',
                'border border-border text-white hover:border-muted hover:bg-white/[0.02] transition-all duration-200',
              )}
            >
              Learn More
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-4">Process</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">How It Works</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {howItWorks.map((item) => (
              <motion.div
                key={item.step}
                variants={childFade}
                className="relative bg-card border border-border rounded-xl p-8 group hover:border-muted transition-colors duration-200"
              >
                {/* Step number */}
                <div className="absolute top-6 right-6 text-[10px] font-mono text-muted/30 tracking-wider">
                  {item.step}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mb-6">
                  {item.icon}
                </div>

                <h3 className="font-display font-semibold text-lg text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed font-body">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BENEFITS                                                     */}
      {/* ============================================================ */}
      <section className="py-24 px-6 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.04) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mb-4">Advantages</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white">
              Why Wholesalers Choose RKV
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            {benefits.map((benefit) => (
              <motion.div
                key={benefit.title}
                variants={childFade}
                className="bg-card border border-border rounded-xl p-8 hover:border-muted transition-colors duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0 mt-0.5">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base text-white mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted leading-relaxed font-body">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  STATS                                                        */}
      {/* ============================================================ */}
      <section className="py-16 px-6">
        <motion.div
          className="max-w-5xl mx-auto bg-card border border-border rounded-2xl overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          custom={0}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="px-6 py-8 text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={0.1 * i}
              >
                <p className="text-2xl sm:text-3xl font-mono font-bold text-gold mb-1">
                  {stat.value}
                </p>
                <p className="text-xs text-muted font-body">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  CTA SECTION                                                  */}
      {/* ============================================================ */}
      <section className="py-24 px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          custom={0}
        >
          <div className="relative bg-card border border-border rounded-2xl p-12 sm:p-16 overflow-hidden glow-border">
            {/* Background grid */}
            <div className="absolute inset-0 blueprint-grid opacity-[0.04] pointer-events-none" />
            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.3) 0%, transparent 70%)',
              }}
            />

            <div className="relative">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-4">
                Ready to Submit Your First Deal?
              </h2>
              <p className="text-muted text-base font-body max-w-lg mx-auto mb-8">
                Join hundreds of wholesalers already using RKV to find buyers faster.
              </p>
              <Link
                href="/submit-deal"
                className={cn(
                  'inline-flex items-center px-10 py-4 rounded-xl font-display font-semibold text-sm tracking-wide',
                  'bg-gold text-black hover:brightness-110 transition-all duration-200',
                )}
                style={{ boxShadow: '0 0 40px rgba(201,168,76,0.25)' }}
              >
                Submit a Deal
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <span className="font-display font-extrabold text-base text-white tracking-tight">RKV</span>
              <div className="w-px h-4 bg-border" />
              <span className="font-body text-[11px] text-muted uppercase tracking-[0.18em]">Consulting</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-xs font-body">
              <Link href="/submit-deal" className="text-muted hover:text-white transition-colors">
                Submit a Deal
              </Link>
              <Link href="/pricing" className="text-muted hover:text-white transition-colors">
                For Investors
              </Link>
              <Link href="/privacy" className="text-muted hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-muted hover:text-white transition-colors">
                Terms
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-[11px] text-muted font-body">
              &copy; 2026 RKV Consulting. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
