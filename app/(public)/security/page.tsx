'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Lock, Server, Eye, Key, Globe } from 'lucide-react';

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
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">Meridian Node</span>
          </Link>
          <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
            <Shield size={24} className="text-accent" />
          </div>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">Security</h1>
          <p className="text-sm text-text-secondary max-w-lg mx-auto">
            Security is foundational to Meridian Node. Here&apos;s how we protect your data and infrastructure intelligence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {practices.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <p.icon size={16} className="text-accent" />
                <h3 className="font-display text-sm font-bold text-text-primary">{p.title}</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{p.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 glass-card p-6 text-center"
          style={{ borderColor: 'rgba(0,212,170,0.15)' }}
        >
          <h3 className="font-display text-sm font-bold text-text-primary mb-2">Report a Vulnerability</h3>
          <p className="text-xs text-text-secondary mb-3">
            If you discover a security vulnerability, please report it responsibly to security@meridiannode.io
          </p>
          <a
            href="mailto:security@meridiannode.io"
            className="inline-flex items-center gap-2 rounded-lg border border-accent/30 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/5 transition-colors"
          >
            <Lock size={12} />
            security@meridiannode.io
          </a>
        </motion.div>
      </div>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} MeridianNode by RKV</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
