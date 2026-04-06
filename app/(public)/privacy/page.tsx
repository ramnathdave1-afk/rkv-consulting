'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const sections = [
  {
    title: 'Information We Collect',
    content: 'We collect information you provide directly: name, email, company, job title, and payment information (processed securely by Stripe). We also collect usage data: pages visited, features used, API calls made, and device/browser information. Site analysis data you create (coordinates, feasibility results, scores) is stored in your organization\'s account.',
  },
  {
    title: 'How We Use Your Information',
    content: 'We use your information to: (a) provide and improve the Service; (b) process payments and manage subscriptions; (c) send transactional emails (welcome, password reset, analysis notifications); (d) generate AI-powered insights and recommendations; (e) monitor system performance and security. We do not sell your personal information to third parties.',
  },
  {
    title: 'Data Sources',
    content: 'RKV Consulting aggregates data from public government sources including FEMA (flood zones), EIA (energy infrastructure), Census Bureau (demographics), NREL (renewable energy data), and OpenStreetMap (infrastructure). We may also use licensed data from providers like Regrid (parcel data). All data is used in compliance with source terms.',
  },
  {
    title: 'AI Processing',
    content: 'We use Anthropic\'s Claude AI models to power chat, feasibility analysis, and portfolio insights. Your queries and site data may be processed by these models to generate responses. AI-generated content is not stored by the AI provider beyond the processing session. We retain the results in your account for your reference.',
  },
  {
    title: 'Data Storage & Security',
    content: 'Data is stored in Supabase (PostgreSQL) with row-level security policies. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). Authentication is handled via Supabase Auth with secure JWT tokens. We follow OWASP security best practices and conduct regular security reviews.',
  },
  {
    title: 'Data Sharing',
    content: 'We share data only with: (a) Stripe for payment processing; (b) Resend for transactional email delivery; (c) Anthropic for AI-powered features; (d) Mapbox for map visualization (no personal data shared). We may disclose information if required by law or to protect the rights and safety of our users.',
  },
  {
    title: 'Your Rights',
    content: 'You can: (a) access and export your data via the dashboard or API; (b) update your profile information in Settings; (c) delete your account and all associated data; (d) opt out of marketing communications. To exercise these rights, contact privacy@rkvconsulting.com or use the in-app settings.',
  },
  {
    title: 'Cookies & Analytics',
    content: 'We use essential cookies for authentication and session management. We may use analytics tools to understand feature usage and improve the product. You can control cookie preferences through your browser settings.',
  },
  {
    title: 'Data Retention',
    content: 'Active account data is retained as long as your account is active. Upon account deletion, personal data is removed within 30 days. Anonymized, aggregated data may be retained indefinitely for service improvement. API usage logs are retained for 90 days.',
  },
  {
    title: 'Contact',
    content: 'For privacy-related questions: privacy@rkvconsulting.com. For data deletion requests: Contact us through the app settings or email.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">RKV Consulting</span>
          </Link>
          <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
          <p className="text-sm text-text-muted mb-10">Last updated: March 15, 2026</p>
        </motion.div>

        <div className="space-y-8">
          {sections.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <h2 className="font-display text-sm font-bold text-text-primary mb-2">{s.title}</h2>
              <p className="text-xs text-text-secondary leading-relaxed">{s.content}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} RKV Consulting by RKV</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="/pricing" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
