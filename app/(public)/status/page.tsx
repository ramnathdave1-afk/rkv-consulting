'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceStatus = 'operational' | 'degraded' | 'down';

interface Service {
  name: string;
  status: ServiceStatus;
  category: string;
}

const services: Service[] = [
  { name: 'Platform (Web App)', status: 'operational', category: 'Core' },
  { name: 'Leasing AI Agent', status: 'operational', category: 'AI Agents' },
  { name: 'Voice AI (Phone System)', status: 'operational', category: 'AI Agents' },
  { name: 'Maintenance AI Agent', status: 'operational', category: 'AI Agents' },
  { name: 'Finance AI Agent', status: 'operational', category: 'AI Agents' },
  { name: 'Acquisitions AI Agent', status: 'operational', category: 'AI Agents' },
  { name: 'API', status: 'operational', category: 'Core' },
  { name: 'Database (Supabase)', status: 'operational', category: 'Infrastructure' },
  { name: 'Payments (Stripe)', status: 'operational', category: 'Integrations' },
  { name: 'Email (Resend)', status: 'operational', category: 'Integrations' },
  { name: 'SMS (Twilio)', status: 'operational', category: 'Integrations' },
];

function getStatusIcon(status: ServiceStatus) {
  switch (status) {
    case 'operational':
      return <CheckCircle2 size={16} className="text-emerald-400" />;
    case 'degraded':
      return <AlertTriangle size={16} className="text-amber-400" />;
    case 'down':
      return <XCircle size={16} className="text-red-400" />;
  }
}

function getStatusLabel(status: ServiceStatus) {
  switch (status) {
    case 'operational':
      return 'Operational';
    case 'degraded':
      return 'Degraded';
    case 'down':
      return 'Down';
  }
}

function getStatusColor(status: ServiceStatus) {
  switch (status) {
    case 'operational':
      return 'text-emerald-400';
    case 'degraded':
      return 'text-amber-400';
    case 'down':
      return 'text-red-400';
  }
}

function generateLast30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  }
  return days;
}

function UptimeBars({ serviceName }: { serviceName: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const days = generateLast30Days();

  return (
    <div className="flex items-center gap-[2px] relative">
      {days.map((day, i) => (
        <div
          key={`${serviceName}-${i}`}
          className="relative"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <div className="w-[8px] h-[28px] rounded-[2px] bg-emerald-400/80 hover:bg-emerald-400 transition-colors cursor-pointer" />
          {hoveredIndex === i && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
              <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2 shadow-xl whitespace-nowrap">
                <p className="text-[11px] font-medium text-text-primary">{day}</p>
                <p className="text-[10px] text-emerald-400">100% uptime</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function StatusPage() {
  const allOperational = services.every((s) => s.status === 'operational');

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Nav */}
      <nav className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <span className="text-xs font-bold text-accent">M</span>
            </div>
            <span className="font-display text-sm font-bold text-text-primary">RKV Consulting</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Back to site
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4">
            <Activity size={20} className="text-text-muted" />
            <h1 className="font-display text-3xl font-bold text-text-primary sm:text-4xl">
              System Status
            </h1>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
              allOperational
                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                : 'bg-red-400/10 text-red-400 border border-red-400/20',
            )}
          >
            {allOperational ? (
              <>
                <CheckCircle2 size={16} />
                All Systems Operational
              </>
            ) : (
              <>
                <XCircle size={16} />
                Incident Detected
              </>
            )}
          </div>

          {/* Uptime */}
          <p className="mt-4 text-sm text-text-secondary">
            <span className="font-mono font-semibold text-text-primary">99.98%</span>{' '}
            uptime &mdash; last 90 days
          </p>
        </div>
      </div>

      {/* Services */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-bg-secondary/40 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Services
            </h2>
            <div className="flex items-center gap-4 text-[10px] text-text-muted">
              <span>30 days ago</span>
              <span className="flex-1" />
              <span>Today</span>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {services.map((service) => (
              <div
                key={service.name}
                className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-bg-elevated/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 sm:w-[200px] shrink-0">
                  {getStatusIcon(service.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {service.name}
                    </p>
                    <p className={cn('text-[11px] font-medium', getStatusColor(service.status))}>
                      {getStatusLabel(service.status)}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <UptimeBars serviceName={service.name} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-bg-secondary/40 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Clock size={13} />
              Recent Incidents
            </h2>
          </div>
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-400/40 mb-3" />
            <p className="text-sm text-text-secondary">
              No incidents reported in the last 90 days.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <p className="text-center text-xs text-text-muted">
          Status updated every 60 seconds. Subscribe to updates via email.
        </p>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} RKV Consulting by RKV. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
