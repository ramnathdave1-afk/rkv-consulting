'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  CreditCard,
  Sparkles,
  Calculator,
  Building2,
  ArrowRight,
} from 'lucide-react';

type StatusKind = 'working' | 'coming_soon' | 'custom';

interface IntegrationRow {
  id: string;
  label: string;
  description: string;
  status: StatusKind;
  icon: React.ElementType;
  href?: string;
  lastSyncAt?: string | null;
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
    id: 'buildium',
    label: 'Buildium',
    description:
      'Two-way sync of properties, units, tenants, leases, and work orders via the Buildium REST API.',
    status: 'working',
    icon: Building2,
    href: '/integrations/buildium',
  },
  {
    id: 'appfolio',
    label: 'AppFolio',
    description:
      'Sync properties, units, tenants, leases, and work orders via CSV upload, scheduled SFTP, or webhooks.',
    status: 'working',
    icon: Building2,
    href: '/integrations/appfolio',
  },
  {
    id: 'quickbooks',
    label: 'QuickBooks',
    description: 'Accounting sync — OAuth scaffolded, full sync coming soon.',
    status: 'coming_soon',
    icon: Calculator,
  },
];

function StatusPill({ status }: { status: StatusKind }) {
  if (status === 'working') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 size={10} />
        Connected
      </span>
    );
  }
  if (status === 'coming_soon') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
        <Clock size={10} />
        Coming soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
      Custom
    </span>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-[#020617]">Integrations</h1>
        <p className="text-sm text-slate-500">
          Below are the integrations that are live today. Bring your existing property data via CSV import.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => {
          const Icon = item.icon;
          const card = (
            <div className="block group cursor-pointer h-full">
              <div className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-md bg-sky-50 flex items-center justify-center">
                    <Icon size={18} className="text-[#0369A1]" />
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <h3 className="font-display font-semibold text-[#020617]">{item.label}</h3>
                <p className="text-sm text-slate-500 mt-1 flex-1">{item.description}</p>
                <p className="text-xs text-slate-400 mt-3">
                  {item.lastSyncAt
                    ? `Last synced ${new Date(item.lastSyncAt).toLocaleString()}`
                    : item.href
                    ? 'Click to configure'
                    : 'Active'}
                </p>
              </div>
            </div>
          );
          return item.href ? (
            <Link key={item.id} href={item.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={item.id}>{card}</div>
          );
        })}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h2 className="font-display text-sm font-semibold text-[#020617] mb-1">
          Need a custom integration?
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Buildium and AppFolio are live today (Buildium via the official REST API; AppFolio via CSV
          upload, scheduled SFTP, and webhooks). Other PMS platforms (Yardi, RealPage, Entrata, DoorLoop,
          Rent Manager, Propertyware, ResMan) are on the roadmap. We can build a custom data pipeline for
          your portfolio on request, or you can import via CSV right now.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#020617] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Import via CSV
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0369A1] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0284C7] transition-colors cursor-pointer"
          >
            Talk to Sales
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
