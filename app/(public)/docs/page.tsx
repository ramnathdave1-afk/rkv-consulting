'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PATCH: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
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
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">RKV Consulting</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,170,0.06)_0%,_transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-4">
              <Book size={24} className="text-accent" />
            </div>
            <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">API Documentation</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-text-secondary">
              Integrate RKV Consulting into your workflow
            </p>
          </motion.div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-lg font-bold text-text-primary mb-5">Getting Started</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Code2 size={15} className="text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Base URL</p>
                <code className="text-[11px] text-accent bg-accent/5 px-1.5 py-0.5 rounded font-mono">
                  https://api.rkvconsulting.com/v1
                </code>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Key size={15} className="text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Authentication</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Bearer token in the <code className="text-accent bg-accent/5 px-1 py-0.5 rounded font-mono">Authorization</code> header
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Gauge size={15} className="text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Rate Limits</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  1,000 req/min <span className="text-text-muted">(Growth)</span><br />
                  10,000 req/min <span className="text-text-muted">(Enterprise)</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <FileText size={15} className="text-accent" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">Response Format</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  All responses are returned as <code className="text-accent bg-accent/5 px-1 py-0.5 rounded font-mono">JSON</code>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main content: sidebar + endpoints */}
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — tabs on mobile, sidebar on desktop */}
          <motion.aside
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:w-56 shrink-0"
          >
            <div className="lg:sticky lg:top-20">
              <p className="hidden lg:block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-3 px-2">
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
                        'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all shrink-0',
                        active
                          ? 'bg-accent/10 text-accent border border-accent/20'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-transparent',
                      )}
                    >
                      <s.icon size={14} />
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
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10">
                <currentSection.icon size={18} className="text-accent" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-text-primary">{currentSection.label}</h2>
                <p className="text-[11px] text-text-muted">
                  /v1{currentSection.endpoints[0]?.path.replace(/\/:id.*/, '')}
                </p>
              </div>
            </div>

            {/* Endpoints list */}
            <div className="space-y-2">
              {currentSection.endpoints.map((ep, i) => (
                <div
                  key={i}
                  className="glass-card px-4 py-3 flex items-center gap-3 hover:border-border-hover transition-colors"
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide w-16 text-center shrink-0',
                      methodColor[ep.method],
                    )}
                  >
                    {ep.method}
                  </span>
                  <code className="text-xs font-mono text-text-primary">{ep.path}</code>
                  <ChevronRight size={12} className="text-text-muted ml-auto hidden sm:block shrink-0" />
                  <span className="text-xs text-text-secondary hidden sm:block shrink-0">
                    {ep.description}
                  </span>
                </div>
              ))}
            </div>

            {/* Webhook events */}
            {currentSection.events && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-text-primary mb-2">Events</p>
                <div className="flex flex-wrap gap-2">
                  {currentSection.events.map((event) => (
                    <span
                      key={event}
                      className="inline-block rounded-md border border-border bg-bg-secondary/60 px-2.5 py-1 text-[11px] font-mono text-text-secondary"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Example request — only for Properties */}
            {activeSection === 'properties' && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-text-primary">Example Request / Response</p>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="rounded-xl border border-border bg-[#0d1117] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-bg-secondary/30">
                    <span className={cn('inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', methodColor.GET)}>
                      GET
                    </span>
                    <code className="text-[11px] font-mono text-text-secondary">/properties</code>
                  </div>
                  <pre className="p-4 text-[11px] leading-relaxed font-mono text-text-secondary overflow-x-auto">
                    <code>{exampleCode}</code>
                  </pre>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} RKV Consulting by RKV. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Terms</Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
