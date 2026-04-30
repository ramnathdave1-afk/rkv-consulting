'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Mail, MessageSquare, CreditCard, Sparkles, Calculator } from 'lucide-react';

interface IntegrationRow {
  id: string;
  label: string;
  description: string;
  status: 'working' | 'coming_soon';
  icon: React.ElementType;
}

const integrations: IntegrationRow[] = [
  {
    id: 'twilio',
    label: 'Twilio',
    description: 'SMS and voice for AI agents.',
    status: 'working',
    icon: MessageSquare,
  },
  {
    id: 'resend',
    label: 'Resend',
    description: 'Transactional email delivery.',
    status: 'working',
    icon: Mail,
  },
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'Subscription billing and per-unit metering.',
    status: 'working',
    icon: CreditCard,
  },
  {
    id: 'claude',
    label: 'Claude AI',
    description: 'Anthropic Claude powering all AI agents.',
    status: 'working',
    icon: Sparkles,
  },
  {
    id: 'quickbooks',
    label: 'QuickBooks',
    description: 'Accounting sync — OAuth scaffolded, full sync coming soon.',
    status: 'coming_soon',
    icon: Calculator,
  },
];

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text-primary">Integrations</h1>
        <p className="text-sm text-text-secondary">
          Below are the integrations that are live today. Bring your existing property data via CSV import.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => {
          const Icon = item.icon;
          const working = item.status === 'working';
          return (
            <div key={item.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                    <Icon size={16} className="text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">{item.label}</h3>
                      {working ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-400/10 text-emerald-400">
                          <CheckCircle2 size={9} />
                          Working
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-400/10 text-amber-400">
                          <Clock size={9} />
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{item.description}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Need a custom integration?</h2>
        <p className="text-xs text-text-secondary mb-3">
          We don&apos;t ship pre-built connectors for AppFolio, Buildium, Yardi, RealPage, Entrata, DoorLoop,
          Rent Manager, Propertyware, or ResMan today. We can build a custom data pipeline for your portfolio
          on request, or you can import via CSV right now.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/import"
            className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            Import via CSV
          </Link>
          <Link
            href="/contact"
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition-colors"
          >
            Contact sales
          </Link>
        </div>
      </div>
    </div>
  );
}
