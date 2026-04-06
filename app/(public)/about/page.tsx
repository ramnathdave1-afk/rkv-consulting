'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, Globe, Zap, Shield, Target, Users } from 'lucide-react';

const values = [
  { icon: Cpu, title: 'AI-First Intelligence', description: 'Autonomous agents continuously scan, score, and analyze sites — replacing months of manual research with real-time insights.' },
  { icon: Globe, title: 'Multi-Vertical Coverage', description: 'Data centers, solar, wind, EV charging, industrial, residential — one platform for all infrastructure development verticals.' },
  { icon: Target, title: 'Precision Scoring', description: 'Five-dimension composite scoring (grid, land, risk, market, connectivity) calibrated per vertical with configurable weights.' },
  { icon: Shield, title: 'Enterprise Security', description: 'Row-level security, encrypted data at rest and in transit, role-based access control, and SOC 2 compliance roadmap.' },
  { icon: Zap, title: 'Real-Time Data', description: 'Live feeds from EIA, FEMA, Census, NREL, and infrastructure APIs — always current, never stale.' },
  { icon: Users, title: 'Team Collaboration', description: 'Shared pipelines, role-based permissions, and real-time notifications keep distributed teams aligned.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">RKV Consulting</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Pricing</Link>
            <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,170,0.05)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-4xl font-bold text-text-primary sm:text-5xl">
              The Intelligence Layer for<br />Infrastructure Development
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary leading-relaxed">
              RKV Consulting replaces months of manual site research with AI-powered intelligence. Our autonomous agents continuously scan infrastructure, score sites, and surface opportunities — so developers can move faster with better data.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Mission */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 text-center"
          style={{ borderColor: 'rgba(0,212,170,0.15)' }}
        >
          <h2 className="font-display text-lg font-bold text-accent mb-3">Our Mission</h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mx-auto">
            To democratize infrastructure intelligence. Every developer — from solo operators to enterprise teams — deserves access to the same quality of site analysis that was previously reserved for firms with dedicated land acquisition departments.
          </p>
        </motion.div>
      </div>

      {/* Values Grid */}
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="font-display text-2xl font-bold text-text-primary text-center mb-8">What Sets Us Apart</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 hover:border-border-hover transition-colors"
            >
              <v.icon className="mb-3 h-5 w-5 text-accent" />
              <h3 className="font-display text-sm font-semibold text-text-primary">{v.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{v.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <h2 className="font-display text-2xl font-bold text-text-primary mb-3">Built by RKV Consulting</h2>
        <p className="text-sm text-text-secondary max-w-xl mx-auto">
          RKV Consulting is an AI agency building intelligent tools for the infrastructure and energy sectors. RKV Consulting is our flagship platform, combining deep domain expertise with cutting-edge AI.
        </p>
      </div>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} RKV Consulting by RKV</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy</Link>
            <Link href="/contact" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
