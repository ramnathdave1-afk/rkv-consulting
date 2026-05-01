'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings as SettingsIcon,
  CreditCard,
  Palette,
  MapPin,
  Users,
  History,
  ShieldCheck,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sales Intelligence Dashboard styled settings shell.
 * Two-column layout: sticky left nav + flex-1 content.
 * White surfaces, slate borders, sky-blue accent.
 */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Overview', href: '/settings', icon: SettingsIcon, exact: true },
  { label: 'Billing', href: '/settings/billing', icon: CreditCard },
  { label: 'Branding', href: '/settings/branding', icon: Palette },
  { label: 'Locations', href: '/settings/locations', icon: MapPin },
  { label: 'Team', href: '/settings/team', icon: Users },
  { label: 'Audit Log', href: '/settings/audit-log', icon: History },
  { label: 'SSO / SAML', href: '/settings/sso', icon: ShieldCheck },
  { label: 'SLA Policies', href: '/settings/sla', icon: Timer },
  { label: 'Incidents', href: '/settings/admin/incidents', icon: AlertTriangle },
];

interface SettingsShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsShell({ title, subtitle, actions, children }: SettingsShellProps) {
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (!pathname) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  }

  return (
    <div className="flex gap-6 max-w-6xl mx-auto py-6 px-6">
      <nav className="w-56 shrink-0 sticky top-20 self-start">
        <h2 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Settings
        </h2>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors duration-200 cursor-pointer',
                    active
                      ? 'bg-sky-50 text-[#0369A1] font-medium'
                      : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#020617] mb-1">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}

/* ── Reusable card primitives ── */

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function SettingsCard({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-lg shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsCardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="font-display font-semibold text-[#020617]">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function SettingsCardBody({ className, children }: CardProps) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export const settingsInputClass =
  'w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-[#020617] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0369A1] focus:border-transparent';

export const settingsLabelClass =
  'block text-sm font-medium text-slate-700 mb-1';

export const settingsPrimaryButtonClass =
  'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[#0369A1] text-white text-sm font-medium hover:bg-[#075985] disabled:opacity-50 transition-colors';

export const settingsSecondaryButtonClass =
  'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors';

export const settingsDangerButtonClass =
  'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors';

/**
 * Toggle switch — slate-200 off / sky-700 on.
 */
export function SettingsToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-[#0369A1]' : 'bg-slate-200',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
