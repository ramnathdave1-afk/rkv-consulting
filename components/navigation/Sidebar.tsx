'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Map,
  Building2,
  Kanban,
  Bot,
  FileText,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/sites', label: 'Sites', icon: Building2 },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/reports', label: 'Reports', icon: FileText },
];

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/settings/team', label: 'Team', icon: Users },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-2 py-3 space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                collapsed && 'justify-center px-2',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
