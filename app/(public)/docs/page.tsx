'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/landing/StatusBadge';
import {
  Book,
  Building2,
  DoorOpen,
  Users,
  FileText,
  Wrench,
  MessageSquare,
  Phone,
  BarChart3,
  Handshake,
  Webhook,
  Copy,
  Check,
  ChevronRight,
  Key,
  Gauge,
  Code2,
} from 'lucide-react';

/* ---------- types ---------- */
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Endpoint {
  method: Method;
  path: string;
  description: string;
}

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  endpoints: Endpoint[];
  events?: string[];
}

/* ---------- data ---------- */
const sections: Section[] = [
  {
    id: 'properties',
    label: 'Properties',
    icon: Building2,
    endpoints: [
      { method: 'GET', path: '/properties', description: 'List all properties' },
      { method: 'POST', path: '/properties', description: 'Create a property' },
      { method: 'GET', path: '/properties/:id', description: 'Get property details' },
      { method: 'PATCH', path: '/properties/:id', description: 'Update a property' },
      { method: 'DELETE', path: '/properties/:id', description: 'Delete a property' },
    ],
  },
  {
    id: 'units',
    label: 'Units',
    icon: DoorOpen,
    endpoints: [
      { method: 'GET', path: '/units', description: 'List all units' },
      { method: 'POST', path: '/units', description: 'Create a unit' },
      { method: 'GET', path: '/units/:id', description: 'Get unit details' },
      { method: 'PATCH', path: '/units/:id', description: 'Update a unit' },
    ],
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: Users,
    endpoints: [
      { method: 'GET', path: '/tenants', description: 'List all tenants' },
      { method: 'POST', path: '/tenants', description: 'Create a tenant' },
      { method: 'GET', path: '/tenants/:id', description: 'Get tenant details' },
    ],
  },
  {
    id: 'leases',
    label: 'Leases',
    icon: FileText,
    endpoints: [
      { method: 'GET', path: '/leases', description: 'List leases' },
      { method: 'POST', path: '/leases', description: 'Create a lease' },
    ],
  },
  {
    id: 'work-orders',
    label: 'Work Orders',
    icon: Wrench,
    endpoints: [
      { method: 'GET', path: '/work-orders', description: 'List work orders' },
      { method: 'POST', path: '/work-orders', description: 'Create a work order' },
      { method: 'PATCH', path: '/work-orders/:id', description: 'Update status' },
    ],
  },
  {
    id: 'conversations',
    label: 'Conversations',
    icon: MessageSquare,
    endpoints: [
      { method: 'GET', path: '/conversations', description: 'List conversations' },
      { method: 'GET', path: '/conversations/:id', description: 'Get conversation details' },
      { method: 'POST', path: '/conversations/:id/reply', description: 'Send a reply' },
    ],
  },
  {
    id: 'voice-ai',
    label: 'Voice AI',
    icon: Phone,
    endpoints: [
      { method: 'GET', path: '/voice/stats', description: 'Get call statistics' },
      { method: 'GET', path: '/voice/transcripts', description: 'Get call transcripts' },
      { method: 'POST', path: '/voice/campaigns', description: 'Create a voice campaign' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    endpoints: [
      { method: 'GET', path: '/reports', description: 'List reports' },
      { method: 'POST', path: '/reports/generate', description: 'Generate an owner report' },
      { method: 'GET', path: '/reports/:id', description: 'Download a report' },
    ],
  },
  {
    id: 'deals',
    label: 'Deals',
    icon: Handshake,
    endpoints: [
      { method: 'GET', path: '/deals', description: 'List acquisition deals' },
      { method: 'POST', path: '/deals', description: 'Submit a deal for scoring' },
      { method: 'GET', path: '/deals/:id/score', description: 'Get AI deal score' },
    ],
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    icon: Webhook,
    endpoints: [
      { method: 'POST', path: '/webhooks', description: 'Register a webhook' },
    ],
    events: [
      'work_order.created',
      'lease.expiring',
      'payment.received',
      'ai.response',
      'voice.call.completed',
    ],
  },
];

const methodColor: Record<Method, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-sky-50 text-sky-700 border-sky-200',
  PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
};

const exampleCode = `GET /properties
Authorization: Bearer sk_live_...

Response:
{
  "data": [
    {
      "id": "prop_abc123",
      "name": "Scottsdale Gardens",
      "address": "4821 N Scottsdale Rd",
      "units": 64,
      "occupancy_rate": 0.969
    }
  ],
  "meta": { "total": 12, "page": 1 }
}`;

/* ---------- component ---------- */
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('properties');
  const [copied, setCopied] = useState(false);

  const currentSection = sections.find((s) => s.id === activeSection) ?? sections[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[#0369A1] px-4 h-9 inline-flex items-center text-sm font-semibold text-white hover:bg-[#0284C7] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0369A1] focus-visible:ring-offset-2"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#0369A1]/10 mx-auto mb-5">
              <Book size={24} className="text-[#0369A1]" />
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight text-[#020617]">API Documentation</h1>
            <p className="mx-auto mt-5 max-w-xl text-xl md:text-2xl text-[#475569]">
              Integrate RKV Consulting into your workflow
            </p>
          </motion.div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm"
        >
          <h2 className="font-display text-2xl font-bold text-[#0F172A] mb-6">Getting Started</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <Code2 size={16} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-1">Base URL</p>
                <code className="text-xs text-[#0369A1] bg-sky-50 px-1.5 py-0.5 rounded font-mono">
                  https://api.rkvconsulting.com/v1
                </code>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <Key size={16} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-1">Authentication</p>
                <p className="text-xs text-[#475569]" style={{ lineHeight: 1.6 }}>
                  Bearer token in the <code className="text-[#0369A1] bg-sky-50 px-1 py-0.5 rounded font-mono">Authorization</code> header
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <Gauge size={16} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-1">Rate Limits</p>
                <p className="text-xs text-[#475569]" style={{ lineHeight: 1.6 }}>
                  1,000 req/min <span className="text-slate-400">(Growth)</span><br />
                  10,000 req/min <span className="text-slate-400">(Enterprise)</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0369A1]/10">
                <FileText size={16} className="text-[#0369A1]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] mb-1">Response Format</p>
                <p className="text-xs text-[#475569]" style={{ lineHeight: 1.6 }}>
                  All responses are returned as <code className="text-[#0369A1] bg-sky-50 px-1 py-0.5 rounded font-mono">JSON</code>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main content: sidebar + endpoints */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:w-60 shrink-0"
          >
            <div className="lg:sticky lg:top-20">
              <p className="hidden lg:block text-xs font-semibold uppercase tracking-wider text-[#475569] mb-3 px-2">
                API Sections
              </p>
              <div className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                {sections.map((s) => {
                  const active = s.id === activeSection;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={cn(
                        'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors shrink-0 cursor-pointer',
                        active
                          ? 'bg-[#0369A1]/10 text-[#0369A1] border border-[#0369A1]/20'
                          : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 border border-transparent',
                      )}
                    >
                      <s.icon size={15} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.aside>

          {/* Endpoint detail */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 min-w-0"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0369A1]/10">
                <currentSection.icon size={20} className="text-[#0369A1]" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0F172A]">{currentSection.label}</h2>
                <p className="text-xs text-[#475569]">
                  /v1{currentSection.endpoints[0]?.path.replace(/\/:id.*/, '')}
                </p>
              </div>
            </div>

            {/* Endpoints list */}
            <div className="space-y-2">
              {currentSection.endpoints.map((ep, i) => (
                <div
                  key={i}
                  className="rounded-md border border-slate-200 bg-white px-4 py-3 flex items-center gap-3 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide w-16 text-center shrink-0',
                      methodColor[ep.method],
                    )}
                  >
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-[#020617]">{ep.path}</code>
                  <ChevronRight size={12} className="text-slate-400 ml-auto hidden sm:block shrink-0" />
                  <span className="text-sm text-[#475569] hidden sm:block shrink-0">
                    {ep.description}
                  </span>
                </div>
              ))}
            </div>

            {/* Webhook events */}
            {currentSection.events && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Events</p>
                <div className="flex flex-wrap gap-2">
                  {currentSection.events.map((event) => (
                    <span
                      key={event}
                      className="inline-block rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono text-[#475569]"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Example request — only for Properties */}
            {activeSection === 'properties' && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[#0F172A]">Example Request / Response</p>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-[#0369A1]" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-[#0F172A] overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50 bg-slate-800/50">
                    <span className={cn('inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', methodColor.GET)}>
                      GET
                    </span>
                    <code className="text-xs font-mono text-slate-300">/properties</code>
                  </div>
                  <pre className="p-4 text-xs leading-relaxed font-mono text-slate-300 overflow-x-auto">
                    <code>{exampleCode}</code>
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#475569]">&copy; {new Date().getFullYear()} RKV Consulting by RKV. All rights reserved.</p>
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
