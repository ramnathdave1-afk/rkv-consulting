'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, Building2, Users, FileText, Plus, Wrench, MessageSquare,
  HardHat, BarChart3, Settings, LayoutDashboard, Link2, CalendarDays, Target,
  Upload, CreditCard, Phone, Megaphone, ClipboardCheck, MapPin, AlertTriangle,
  FileSearch, ArrowUp, ArrowDown, CornerDownLeft, X,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'property' | 'tenant' | 'work_order';
  name: string;
  subtitle: string;
}

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navSections = [
  {
    label: 'Portfolio',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview', 'kpi'] },
      { label: 'Properties', href: '/properties', icon: Building2, keywords: ['buildings', 'units'] },
      { label: 'Tenants', href: '/tenants', icon: Users, keywords: ['residents', 'people'] },
      { label: 'Leases', href: '/leases', icon: FileText, keywords: ['contracts', 'renewals'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Work Orders', href: '/work-orders', icon: Wrench, keywords: ['maintenance', 'repairs'] },
      { label: 'Showings', href: '/showings', icon: CalendarDays, keywords: ['tours', 'schedule'] },
      { label: 'Move-Ins', href: '/move-ins', icon: ClipboardCheck, keywords: ['checklist', 'onboarding'] },
      { label: 'Field Ops', href: '/field-ops', icon: MapPin, keywords: ['technician', 'mobile'] },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Conversations', href: '/conversations', icon: MessageSquare, keywords: ['chat', 'sms', 'messages'] },
      { label: 'Voice AI', href: '/voice', icon: Phone, keywords: ['calls', 'phone', 'twilio'] },
      { label: 'Campaigns', href: '/campaigns', icon: Megaphone, keywords: ['blast', 'email', 'marketing'] },
    ],
  },
  {
    label: 'Financials',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, keywords: ['analytics', 'revenue', 'noi'] },
      { label: 'Delinquency', href: '/delinquency', icon: AlertTriangle, keywords: ['collections', 'late', 'rent'] },
      { label: 'Lease Audits', href: '/lease-audits', icon: FileSearch, keywords: ['scan', 'revenue leak'] },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Acquisitions', href: '/acquisitions', icon: Target, keywords: ['deals', 'pipeline', 'crm'] },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Vendors', href: '/vendors', icon: HardHat, keywords: ['contractors'] },
      { label: 'Integrations', href: '/integrations', icon: Link2, keywords: ['appfolio', 'buildium', 'connect'] },
      { label: 'Import Data', href: '/import', icon: Upload, keywords: ['csv', 'upload'] },
      { label: 'Billing', href: '/settings/billing', icon: CreditCard, keywords: ['plan', 'subscription'] },
      { label: 'Settings', href: '/settings', icon: Settings, keywords: ['preferences', 'config'] },
      { label: 'Team', href: '/settings/team', icon: Users, keywords: ['members', 'invite'] },
    ],
  },
];

const actionCommands = [
  { label: 'Add Property', action: () => { window.location.href = '/properties?new=1'; }, icon: Plus, keywords: ['create', 'new'] },
  { label: 'New Work Order', action: () => { window.location.href = '/work-orders?new=1'; }, icon: Wrench, keywords: ['create', 'maintenance'] },
  { label: 'Add Tenant', action: () => { window.location.href = '/tenants?new=1'; }, icon: Users, keywords: ['create', 'resident'] },
  { label: 'New Campaign', action: () => { window.location.href = '/campaigns?new=1'; }, icon: Megaphone, keywords: ['create', 'blast'] },
  { label: 'Run Lease Audit', action: () => { window.location.href = '/lease-audits?run=1'; }, icon: FileSearch, keywords: ['scan', 'check'] },
  { label: 'New Deal', action: () => { window.location.href = '/acquisitions?new=1'; }, icon: Target, keywords: ['create', 'acquisition'] },
];

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleSelect(result: SearchResult) {
    onOpenChange(false);
    const routes: Record<string, string> = { property: '/properties', tenant: '/tenants', work_order: '/work-orders' };
    window.location.href = `${routes[result.type] || '/dashboard'}/${result.id}`;
  }

  const typeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    property: Building2, tenant: Users, work_order: Wrench,
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className="fixed left-1/2 top-[15%] z-50 w-full max-w-[580px] -translate-x-1/2"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <Command
              className="rounded-xl border border-white/[0.06] bg-[#0A0A0B]/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden"
              shouldFilter={false}
            >
              {/* Search input */}
              <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-4 py-3">
                {loading ? (
                  <Loader2 size={15} className="text-[#00D4AA] animate-spin shrink-0" />
                ) : (
                  <Search size={15} className="text-white/30 shrink-0" />
                )}
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search pages, commands, properties, tenants..."
                  className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 outline-none"
                />
                <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-white/30">
                  ⌘K
                </kbd>
                <button
                  onClick={() => onOpenChange(false)}
                  className="ml-1 rounded p-1 text-white/25 hover:bg-white/[0.05] hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
                <Command.Empty className="px-4 py-8 text-center text-xs text-white/25">
                  {query ? 'No results found.' : 'Type to search or navigate.'}
                </Command.Empty>

                {/* Search results */}
                {results.length > 0 && (
                  <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/20">
                    {results.map((result) => {
                      const Icon = typeIcons[result.type] || Building2;
                      return (
                        <Command.Item
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer data-[selected=true]:bg-white/[0.06] text-white/60 data-[selected=true]:text-white/90"
                        >
                          <Icon size={14} className="shrink-0 text-white/30" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{result.name}</p>
                            <p className="text-[10px] text-white/30 truncate">{result.subtitle}</p>
                          </div>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                {/* Navigation sections */}
                {!query && navSections.map((section) => (
                  <Command.Group
                    key={section.label}
                    heading={section.label}
                    className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/20"
                  >
                    {section.items.map((cmd) => (
                      <Command.Item
                        key={cmd.href}
                        value={[cmd.label, ...cmd.keywords].join(' ')}
                        onSelect={() => { onOpenChange(false); window.location.href = cmd.href; }}
                        className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs cursor-pointer data-[selected=true]:bg-white/[0.06] text-white/50 data-[selected=true]:text-white/90 transition-colors"
                      >
                        <cmd.icon size={14} className="shrink-0 text-white/25 data-[selected=true]:text-[#00D4AA]" />
                        <span className="flex-1">{cmd.label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}

                {/* Quick actions */}
                {!query && (
                  <Command.Group heading="Quick Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/20">
                    {actionCommands.map((cmd) => (
                      <Command.Item
                        key={cmd.label}
                        value={[cmd.label, ...cmd.keywords].join(' ')}
                        onSelect={() => { onOpenChange(false); cmd.action(); }}
                        className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs cursor-pointer data-[selected=true]:bg-white/[0.06] text-white/50 data-[selected=true]:text-white/90 transition-colors"
                      >
                        <cmd.icon size={14} className="shrink-0 text-[#00D4AA]/60" />
                        <span className="flex-1">{cmd.label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Filtered navigation when typing */}
                {query && navSections.map((section) => {
                  const q = query.toLowerCase();
                  const matching = section.items.filter(cmd =>
                    cmd.label.toLowerCase().includes(q) ||
                    cmd.keywords.some(k => k.includes(q))
                  );
                  if (!matching.length) return null;
                  return (
                    <Command.Group
                      key={section.label}
                      heading={section.label}
                      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/20"
                    >
                      {matching.map((cmd) => (
                        <Command.Item
                          key={cmd.href}
                          onSelect={() => { onOpenChange(false); window.location.href = cmd.href; }}
                          className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs cursor-pointer data-[selected=true]:bg-white/[0.06] text-white/50 data-[selected=true]:text-white/90 transition-colors"
                        >
                          <cmd.icon size={14} className="shrink-0 text-white/25" />
                          <span>{cmd.label}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2 text-[10px] text-white/20">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <CornerDownLeft size={10} /> select
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowUp size={10} />
                    <ArrowDown size={10} /> navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <X size={10} /> close
                  </span>
                </div>
                <span className="text-white/15">RKV Consulting</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
