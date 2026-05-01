'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Lock, Server, Eye, Key, Globe } from 'lucide-react';
import { StatusBadge } from '@/components/landing/StatusBadge';

const practices = [
  { icon: Lock, title: 'Encryption', description: 'All data encrypted in transit (TLS 1.3) and at rest (AES-256). Database connections use SSL. API keys are hashed with SHA-256 before storage.' },
  { icon: Server, title: 'Infrastructure', description: 'Hosted on Vercel (SOC 2 Type II) with Supabase (SOC 2 Type II) for database. Automatic failover, daily backups, and point-in-time recovery.' },
  { icon: Eye, title: 'Access Control', description: 'Row-level security policies on all database tables. Role-based access (admin, analyst, viewer). Multi-tenant isolation via organization IDs.' },
  { icon: Key, title: 'Authentication', description: 'Supabase Auth with secure JWT tokens. Password hashing with bcrypt. Support for password reset flows. API keys with configurable scopes and expiration.' },
  { icon: Globe, title: 'Network Security', description: 'API rate limiting per key and per plan. Webhook signature verification for Stripe. CORS policies restrict cross-origin access.' },
  { icon: Shield, title: 'Compliance Roadmap', description: 'SOC 2 Type II certification planned. GDPR-compliant data handling. Right to erasure supported. Annual security audits on roadmap.' },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0F172A]">
              <span className="text-xs font-bold text-white">R</span>
            </div>
            <span className="font-display text-sm font-bold text-[#0F172A]">RKV Consulting</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Sign In</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#0369A1]/10 mx-auto mb-5">
              <Shield size={24} className="text-[#0369A1]" />
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight text-[#020617]">Security</h1>
            <p className="mt-5 text-xl md:text-2xl text-[#475569] max-w-2xl mx-auto" style={{ lineHeight: 1.7 }}>
              Security is foundational to RKV Consulting. Here&apos;s how we protect your data and infrastructure intelligence.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Practices grid */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {practices.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0369A1]/10 mb-4">
                <p.icon size={18} className="text-[#0369A1]" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#0F172A] mb-2">{p.title}</h3>
              <p className="text-sm text-[#475569]" style={{ lineHeight: 1.7 }}>{p.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Vulnerability CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-xl border border-slate-200 bg-white p-8 md:p-10 text-center shadow-sm"
        >
          <h3 className="font-display text-2xl font-bold text-[#0F172A] mb-3">Report a Vulnerability</h3>
          <p className="text-base text-[#475569] mb-5" style={{ lineHeight: 1.7 }}>
            If you discover a security vulnerability, please report it responsibly to security@rkvconsulting.com.
          </p>
          <a
            href="mailto:security@rkvconsulting.com"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 hover:border-slate-300 text-[#0F172A] px-6 h-12 font-semibold cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
          >
            <Lock size={14} />
            security@rkvconsulting.com
          </a>
        </motion.div>
      </section>

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
