'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Cpu, Globe, Zap, Shield, Target, Users } from 'lucide-react';
import { StatusBadge } from '@/components/landing/StatusBadge';

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
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0F172A]">
              <span className="text-xs font-bold text-white">R</span>
            </div>
            <span className="font-display text-sm font-bold text-[#0F172A]">RKV Consulting</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Pricing</Link>
            <Link href="/login" className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Sign In</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight text-[#020617]">
              The Intelligence Layer for Infrastructure Development
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl md:text-2xl text-[#475569]" style={{ lineHeight: 1.7 }}>
              RKV Consulting replaces months of manual site research with AI-powered intelligence. Our autonomous agents continuously scan infrastructure, score sites, and surface opportunities — so developers can move faster with better data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-3xl px-6 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl border border-slate-200 bg-white p-8 md:p-10 text-center shadow-sm"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0F172A] mb-4">Our Mission</h2>
          <p className="text-base md:text-lg text-[#020617] max-w-2xl mx-auto" style={{ lineHeight: 1.7 }}>
            To democratize infrastructure intelligence. Every developer — from solo operators to enterprise teams — deserves access to the same quality of site analysis that was previously reserved for firms with dedicated land acquisition departments.
          </p>
        </motion.div>
      </section>

      {/* Values Grid */}
      <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-32">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[#020617] text-center mb-12">What Sets Us Apart</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0369A1]/10 mb-4">
                <v.icon className="h-5 w-5 text-[#0369A1]" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#0F172A]">{v.title}</h3>
              <p className="mt-2 text-sm text-[#475569]" style={{ lineHeight: 1.7 }}>{v.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-[#020617] mb-4">Built by RKV Consulting</h2>
        <p className="text-base md:text-lg text-[#475569] max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
          RKV Consulting is an AI agency building intelligent tools for the infrastructure and energy sectors. RKV Consulting is our flagship platform, combining deep domain expertise with cutting-edge AI.
        </p>
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#475569]">&copy; {new Date().getFullYear()} RKV Consulting by RKV</p>
          <div className="flex items-center gap-4">
            <StatusBadge />
            <Link href="/terms" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Terms</Link>
            <Link href="/privacy" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Privacy</Link>
            <Link href="/contact" className="text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
