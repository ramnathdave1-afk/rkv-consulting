'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Calculator,
  Building2,
  Globe,
  Landmark,
  Home,
  Users,
  Wrench,
  Shield,
  Bot,
  Zap,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Lock,
  Menu,
  X,
  Search,
  GitBranch,
  Contact,
  DoorOpen,
  Workflow,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import type { FeatureKey } from '@/lib/stripe/plans';
import { PageTransition } from '@/components/ui/PageTransition';

/* ------------------------------------------------------------------ */
/*  Nav item type                                                      */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  featureKey?: FeatureKey;
  badge?: string;
}

interface NavGroup {
  label: string;
  badge?: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation config                                                  */
/* ------------------------------------------------------------------ */

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Calendar', href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Investments',
    items: [
      { label: 'Deal Feed', href: '/deal-feed', icon: Flame, featureKey: 'dealFeed', badge: 'New' },
      { label: 'Deal Analyzer', href: '/deals', icon: Calculator },
      { label: 'Deal Pipeline', href: '/pipeline', icon: GitBranch },
      { label: 'My Portfolio', href: '/properties', icon: Building2 },
      { label: 'Market Intelligence', href: '/market-intelligence', icon: Globe, featureKey: 'marketIntelligence' },
      { label: 'Financing Hub', href: '/financing-hub', icon: Landmark, featureKey: 'financingHub' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Properties', href: '/properties', icon: Home },
      { label: 'Tenants', href: '/tenants', icon: Users },
      { label: 'Contacts', href: '/contacts', icon: Contact },
      { label: 'Maintenance', href: '/maintenance', icon: Wrench },
      { label: 'Vacancies', href: '/vacancies', icon: DoorOpen },
      { label: 'Tenant Screening', href: '/tenant-screening', icon: Shield, featureKey: 'tenantScreening' },
    ],
  },
  {
    label: 'Automation',
    badge: 'AI',
    items: [
      { label: 'Automations', href: '/automations', icon: Workflow },
      { label: 'AI Assistant', href: '/ai-assistant', icon: Bot, featureKey: 'aiAssistant' },
      { label: 'AI Agents', href: '/ai-agents', icon: Zap, featureKey: 'emailAgents' },
    ],
  },
  {
    label: 'Financials',
    items: [
      { label: 'Accounting', href: '/accounting', icon: Receipt, featureKey: 'accounting' },
      { label: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Breadcrumb helper                                                  */
/* ------------------------------------------------------------------ */

function getBreadcrumb(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/* ------------------------------------------------------------------ */
/*  Layout component                                                   */
/* ------------------------------------------------------------------ */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { plan, hasFeature, isLoading: subLoading } = useSubscription();

  const [user, setUser] = useState<{ email: string; full_name: string | null } | null>(null);
  const [_unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lockedAlert, setLockedAlert] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', authUser.id)
        .single();
      if (profile) {
        setUser(profile);
      } else {
        setUser({ email: authUser.email || '', full_name: null });
      }
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    }
    fetchUserData();
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (lockedAlert) {
      const t = setTimeout(() => setLockedAlert(null), 3000);
      return () => clearTimeout(t);
    }
  }, [lockedAlert]);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || '?';

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* MOBILE OVERLAY */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-[rgba(8,8,8,0.8)] backdrop-blur-sm z-[55] md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ============================================================ */}
      {/*  SIDEBAR                                                      */}
      {/* ============================================================ */}
      <aside className={cn(
        'fixed left-0 top-0 w-[260px] h-screen flex flex-col overflow-y-auto z-[60] transition-transform duration-300',
        'md:translate-x-0',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )} style={{ background: '#050505', borderRight: '1px solid #1e1e1e' }}>

        {/* Brand */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-extrabold text-[20px] text-white tracking-tight">RKV</span>
            <div className="w-px h-5 bg-border" />
            <span className="font-body font-normal text-[11px] text-white/90 uppercase tracking-[0.25em]">
              CONSULTING
            </span>
          </div>

          {/* Subtitle */}
          <p className="mt-2 font-body text-[11px] text-muted-deep">
            Portfolio Intelligence Platform
          </p>

          {/* Plan badge */}
          <div className="mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            <span className="font-body text-[11px] text-gold font-semibold uppercase tracking-wider">
              {subLoading ? '...' : plan.name.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              {/* Group label */}
              <div className="flex items-center gap-2 mb-1.5 px-3">
                <span className="whitespace-nowrap font-body font-semibold text-[10px] uppercase tracking-[0.15em] text-[#333]">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border/30" />
                {group.badge && (
                  <span className="font-body text-[9px] font-semibold text-gold bg-gold/8 border border-gold/20 rounded px-1.5 py-0.5">
                    {group.badge}
                  </span>
                )}
              </div>

              {/* Nav items */}
              <div className="space-y-px">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const isLocked = item.featureKey ? !hasFeature(item.featureKey) : false;
                  const Icon = item.icon;

                  if (isLocked) {
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => setLockedAlert(item.label)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                          'text-muted hover:text-[#94A3B8] transition-colors duration-150 cursor-pointer',
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                        <span className="flex-1 text-left font-body text-[13px]">{item.label}</span>
                        <Lock className="h-3 w-3 text-muted-deep flex-shrink-0" />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-body font-medium',
                        'transition-all duration-150',
                        isActive
                          ? 'text-white bg-[rgba(201,168,76,0.05)] border-l-2 border-gold'
                          : 'text-muted hover:text-[#94A3B8]',
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="font-body text-[9px] font-semibold text-gold bg-gold/8 border border-gold/20 rounded px-1.5 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom — User info */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-gold flex items-center justify-center text-[12px] font-body font-semibold text-gold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-[13px] text-white font-medium truncate">{user?.full_name || user?.email || 'User'}</p>
              <p className="font-body text-[11px] text-muted-deep truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  TOP BAR                                                      */}
      {/* ============================================================ */}
      <header className="fixed top-0 left-0 md:left-[260px] right-0 h-[52px] z-40 flex items-center justify-between px-4 md:px-5" style={{ background: '#080808', borderBottom: '1px solid #1e1e1e' }}>
        {/* Left: hamburger (mobile) + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded text-muted hover:text-white hover:bg-[rgba(201,168,76,0.05)] transition-colors"
          >
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-muted-deep hidden sm:inline font-body">RKV</span>
            <span className="text-border hidden sm:inline">/</span>
            <span className="text-white font-body font-medium">{getBreadcrumb(pathname)}</span>
          </div>
        </div>

        {/* Center: status indicators */}
        <div className="hidden md:flex items-center gap-5">
          <div className="font-body text-[11px] text-muted whitespace-nowrap">
            Markets <span className="text-gold mx-1">●</span> Live
            <span className="mx-3 text-muted-deep"> </span>
            AI <span className="text-gold mx-1">●</span> Ready
            <span className="mx-3 text-muted-deep"> </span>
            Data <span className="text-gold mx-1">●</span> Updated
          </div>
        </div>

        {/* Right: search, notification, avatar */}
        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center justify-center w-8 h-8 rounded text-muted hover:text-gold transition-colors">
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <NotificationCenter />

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full',
                'border border-gold text-gold font-body text-[12px] font-semibold',
                'hover:bg-[rgba(201,168,76,0.05)] transition-colors cursor-pointer',
              )}
            >
              {initials}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-60 rounded-lg overflow-hidden animate-fade-up" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
                <div className="p-3 border-b border-border/50">
                  <p className="text-[13px] font-medium text-white truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="font-body text-[11px] text-muted truncate mt-0.5">
                    {user?.email}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1.5 font-body text-[10px] font-medium text-gold bg-gold/8 border border-gold/20 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    {plan.name} Access
                  </span>
                </div>
                <div className="p-1.5">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] text-muted hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] text-muted hover:text-red hover:bg-red/5 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  LOCKED FEATURE ALERT                                        */}
      {/* ============================================================ */}
      {lockedAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-fade-up">
          <div className="flex items-center gap-3 rounded-lg px-5 py-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
            <Lock className="h-4 w-4 text-gold flex-shrink-0" />
            <p className="text-sm text-white font-body">
              <span className="font-semibold text-gold">{lockedAlert}</span> requires an upgrade.
            </p>
            <Link
              href="/settings?tab=billing"
              className="font-body text-[11px] font-semibold text-gold hover:text-gold-light transition-colors whitespace-nowrap uppercase tracking-wider"
              onClick={() => setLockedAlert(null)}
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <main className="ml-0 md:ml-[260px] mt-[52px] min-h-screen bg-[var(--bg-primary)] p-4 md:p-6 pb-24 md:pb-8" key={pathname}>
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      {/* ============================================================ */}
      {/*  MOBILE BOTTOM NAV                                            */}
      {/* ============================================================ */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 z-50 md:hidden flex items-center justify-around px-2" style={{ background: 'rgba(8, 8, 8, 0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid #1e1e1e' }}>
        {[
          { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Portfolio', href: '/properties', icon: Building2 },
          { label: 'Deals', href: '/deals', icon: Calculator },
          { label: 'Tenants', href: '/tenants', icon: Users },
          { label: 'Settings', href: '/settings', icon: Settings },
        ].map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[52px]',
                'transition-colors duration-150',
                isActive ? 'text-gold' : 'text-muted-deep hover:text-muted',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="font-body text-[9px] tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
