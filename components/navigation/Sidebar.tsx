'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Map,
  Building2,
  Kanban,
  Bot,
  BarChart3,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  Activity,
  ChevronDown,
  Database,
  Key,
  Search,
  CreditCard,
  FileText,
  Server,
  Sun,
  Wind,
  BatteryCharging,
  Factory,
  Home,
  Building2 as Building2Alt,
} from 'lucide-react';
import { ALL_VERTICALS } from '@/lib/verticals';
import type { Vertical } from '@/lib/types';

const navItems = [
  { href: '/map', label: 'Command Center', icon: Map },
  { href: '/agents', label: 'Intelligence Hub', icon: Bot },
  { href: '/sites', label: 'Site Portfolio', icon: Building2 },
  { href: '/pipeline', label: 'Project Pipeline', icon: Kanban },
  { href: '/market', label: 'Market Analytics', icon: BarChart3 },
  { href: '/data-sources', label: 'Data Sources', icon: Database },
  { href: '/feasibility', label: 'Feasibility', icon: Search },
  { href: '/api-keys', label: 'API Keys', icon: Key },
  { href: '/api-docs', label: 'API Docs', icon: FileText },
];

const bottomItems = [
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/settings/team', label: 'Team', icon: Users },
];

interface AgentStatus {
  name: string;
  actions_24h: number;
  status: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const verticalIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  data_center: Server,
  solar: Sun,
  wind: Wind,
  ev_charging: BatteryCharging,
  industrial: Factory,
  residential: Home,
  mixed_use: Building2Alt,
};

export function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [activeVertical, setActiveVertical] = useState<Vertical>('data_center');
  const [verticalDropdownOpen, setVerticalDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/agents/status')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.agents) setAgentStatuses(data.agents); })
      .catch(() => {});
  }, []);

  const activeCount = agentStatuses.filter((a) => a.status === 'running').length;
  const agentColors: Record<string, string> = { alpha: '#00D4AA', beta: '#3B82F6', gamma: '#F59E0B', delta: '#8A00FF' };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-border bg-bg-secondary transition-all duration-200',
          collapsed ? 'w-16' : 'w-56',
          'max-lg:translate-x-[-100%] lg:translate-x-0',
          mobileOpen && 'max-lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <span className="text-sm font-bold text-accent">M</span>
          </div>
          {!collapsed && (
            <span className="font-display text-sm font-bold text-text-primary truncate">
              Meridian Node
            </span>
          )}
        </div>

        {/* Vertical Selector */}
        {!collapsed && (
          <div className="px-2 py-2 border-b border-border">
            <div className="relative">
              <button
                onClick={() => setVerticalDropdownOpen(!verticalDropdownOpen)}
                className="flex w-full items-center gap-2 rounded-lg bg-bg-elevated/50 border border-border/50 px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors"
              >
                {(() => {
                  const Icon = verticalIcons[activeVertical] || Server;
                  return <Icon size={13} className="text-accent shrink-0" />;
                })()}
                <span className="flex-1 text-left truncate">
                  {ALL_VERTICALS.find((v) => v.id === activeVertical)?.label || 'Data Centers'}
                </span>
                <ChevronDown size={12} className={cn('text-text-muted transition-transform', verticalDropdownOpen && 'rotate-180')} />
              </button>
              {verticalDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-bg-secondary shadow-lg py-1">
                  {ALL_VERTICALS.map((v) => {
                    const Icon = verticalIcons[v.id] || Server;
                    return (
                      <button
                        key={v.id}
                        onClick={() => { setActiveVertical(v.id); setVerticalDropdownOpen(false); }}
                        className={cn(
                          'flex w-full items-center gap-2 px-2.5 py-1.5 text-xs transition-colors',
                          activeVertical === v.id ? 'text-accent bg-accent/5' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                        )}
                      >
                        <Icon size={13} className="shrink-0" />
                        <span>{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Agent Status Footer */}
        {!collapsed && agentStatuses.length > 0 && (
          <div className="border-t border-border px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Activity size={10} className="text-text-muted" />
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Agents</span>
            </div>
            <div className="flex items-center gap-1.5">
              {agentStatuses.map((a) => (
                <div
                  key={a.name}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: a.status === 'running' ? agentColors[a.name] : '#4A5568' }}
                  title={`${a.name}: ${a.actions_24h} actions`}
                />
              ))}
              <span className="text-[10px] text-text-muted ml-1">
                {activeCount > 0 ? `${activeCount} active` : 'idle'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-[10px] text-text-muted">Systems Operational</span>
            </div>
          </div>
        )}

        {/* Bottom */}
        <div className="border-t border-border px-2 py-2 space-y-0.5">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={16} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          <button
            onClick={onToggle}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
