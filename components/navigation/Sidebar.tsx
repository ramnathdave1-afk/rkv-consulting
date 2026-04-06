'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Wrench,
  MessageSquare,
  HardHat,
  BarChart3,
  Link2,
  Calendar,
  CalendarDays,
  Upload,
  Target,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Phone,
  Megaphone,
  ClipboardCheck,
  MapPin,
  AlertTriangle,
  FileSearch,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Portfolio',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/calendar', label: 'Calendar', icon: Calendar },
      { href: '/properties', label: 'Properties', icon: Building2 },
      { href: '/tenants', label: 'Tenants', icon: Users },
      { href: '/leases', label: 'Leases', icon: FileText },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/work-orders', label: 'Work Orders', icon: Wrench },
      { href: '/showings', label: 'Showings', icon: CalendarDays },
      { href: '/move-ins', label: 'Move-Ins', icon: ClipboardCheck },
      { href: '/field-ops', label: 'Field Ops', icon: MapPin },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/conversations', label: 'Conversations', icon: MessageSquare },
      { href: '/voice', label: 'Voice AI', icon: Phone },
      { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
    ],
  },
  {
    label: 'Financials',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/delinquency', label: 'Delinquency', icon: AlertTriangle },
      { href: '/lease-audits', label: 'Lease Audits', icon: FileSearch },
    ],
  },
  {
    label: 'Growth',
    items: [
      { href: '/acquisitions', label: 'Acquisitions', icon: Target },
    ],
  },
];

const bottomItems: NavItem[] = [
  { href: '/vendors', label: 'Vendors', icon: HardHat },
  { href: '/integrations', label: 'Integrations', icon: Link2 },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/settings/team', label: 'Team', icon: Users },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'sidebar-item group relative flex items-center gap-3 h-[38px] rounded-xl px-3.5 text-[13px] font-medium',
        isActive
          ? 'active text-[#00bfa6]'
          : 'text-gray-400 hover:text-white',
        collapsed && 'justify-center px-0',
      )}
    >
      {/* Active left bar with glow */}
      {isActive && (
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-[3px]"
          style={{
            background: '#00bfa6',
            boxShadow: '0 0 8px rgba(0,191,166,0.6)',
          }}
        />
      )}
      <item.icon
        size={17}
        strokeWidth={isActive ? 2.2 : 1.8}
        className="shrink-0"
        style={{
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: hovered && !isActive ? 'scale(1.2) translateX(2px)' : 'scale(1)',
        }}
      />
      {!collapsed && (
        <span
          className="truncate"
          style={{
            letterSpacing: '-0.01em',
            transition: 'transform 0.2s ease',
            transform: hovered && !isActive ? 'translateX(2px)' : 'none',
          }}
        >
          {item.label}
        </span>
      )}
      {collapsed && (
        <span className="nav-tooltip">{item.label}</span>
      )}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen flex flex-col',
          collapsed ? 'w-[72px]' : 'w-[264px]',
          'max-lg:translate-x-[-100%] lg:translate-x-0',
          mobileOpen && 'max-lg:translate-x-0',
        )}
        style={{
          transition: 'width 350ms cubic-bezier(0.4,0,0.2,1), transform 220ms ease-out',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3.5 px-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #00bfa6, #00B4D8)',
              transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Building2 size={17} className="text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>RKV</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#00bfa6', letterSpacing: '-0.02em' }}> Consulting</span>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2">
          {navSections.map((section) => (
            <div key={section.label} className="mb-0.5">
              {!collapsed ? (
                <p className="px-3.5 pt-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-tertiary)', userSelect: 'none' }}>
                  {section.label}
                </p>
              ) : (
                <div className="mt-2.5 mb-2 mx-2 h-px" style={{ background: 'var(--border)' }} />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <NavLink
                      key={item.href}
                      item={item}
                      isActive={isActive}
                      collapsed={collapsed}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="px-2.5 py-2 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive}
                collapsed={collapsed}
              />
            );
          })}

          <button
            onClick={onToggle}
            className={cn(
              'sidebar-item flex w-full items-center gap-3 h-[34px] rounded-xl px-3.5 text-[13px] font-medium',
              'text-gray-500 hover:text-white mt-0.5',
              collapsed && 'justify-center px-0',
            )}
            style={{ transition: 'color 0.2s ease' }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* User section */}
        <div className="px-4 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className={cn(
            'flex items-center gap-3',
            collapsed && 'justify-center',
          )}>
            <div
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, #00bfa6, #0ea5e9)' }}
            >
              KR
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-[13px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Kishan R.</p>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Property Manager</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
