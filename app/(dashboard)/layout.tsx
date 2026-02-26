'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
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
  Bell,
  LogOut,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import type { FeatureKey } from '@/lib/stripe/plans';

/* ------------------------------------------------------------------ */
/*  Nav item type                                                      */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  featureKey?: FeatureKey;
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
    label: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'INVESTMENTS',
    items: [
      { label: 'Deal Analyzer', href: '/deals', icon: Calculator },
      { label: 'My Portfolio', href: '/properties', icon: Building2 },
      { label: 'Market Intelligence', href: '/market-intelligence', icon: Globe, featureKey: 'marketIntelligence' },
      { label: 'Financing Hub', href: '/financing-hub', icon: Landmark, featureKey: 'financingHub' },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { label: 'Properties', href: '/properties', icon: Home },
      { label: 'Tenants', href: '/tenants', icon: Users },
      { label: 'Maintenance', href: '/maintenance', icon: Wrench },
      { label: 'Tenant Screening', href: '/tenant-screening', icon: Shield, featureKey: 'tenantScreening' },
    ],
  },
  {
    label: 'AUTOMATION',
    badge: 'AI Powered',
    items: [
      { label: 'AI Assistant', href: '/ai-assistant', icon: Bot, featureKey: 'aiAssistant' },
      { label: 'AI Agents', href: '/ai-agents', icon: Zap, featureKey: 'emailAgents' },
    ],
  },
  {
    label: 'FINANCIALS',
    items: [
      { label: 'Accounting', href: '/accounting', icon: Receipt, featureKey: 'accounting' },
      { label: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    label: 'ACCOUNT',
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
  const { planName, plan, hasFeature, daysUntilRenewal, isLoading: subLoading } = useSubscription();

  // User state
  const [user, setUser] = useState<{ email: string; full_name: string | null } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Locked feature alert
  const [lockedAlert, setLockedAlert] = useState<string | null>(null);

  // Fetch user profile and unread notifications
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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear locked alert after timeout
  useEffect(() => {
    if (lockedAlert) {
      const t = setTimeout(() => setLockedAlert(null), 3000);
      return () => clearTimeout(t);
    }
  }, [lockedAlert]);

  // User initials
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || '?';

  // Logout handler
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-black">
      {/* ============================================================ */}
      {/*  SIDEBAR                                                      */}
      {/* ============================================================ */}
      <aside className="fixed left-0 top-0 w-60 h-screen bg-deep border-r border-border flex flex-col overflow-y-auto z-50">
        {/* Brand */}
        <div className="p-6">
          <h1 className="font-display font-bold text-xl text-white tracking-tight">
            RKV Consulting
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse inline-block" />
            <span className="text-xs font-medium text-gold">
              {subLoading ? '...' : plan.name} Plan
            </span>
          </div>
        </div>

        {/* Navigation groups */}
        <nav className="flex-1 px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              {/* Group label */}
              <div className="flex items-center gap-2 mb-2 px-3">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  {group.label}
                </span>
                {group.badge && (
                  <span className="text-[9px] font-semibold text-gold bg-gold/10 border border-gold/20 rounded-full px-1.5 py-0.5 leading-none">
                    {group.badge}
                  </span>
                )}
              </div>

              {/* Nav items */}
              <div className="space-y-0.5">
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
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                          'text-muted hover:text-text hover:bg-white/5',
                          'transition-colors duration-150 cursor-pointer',
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <Lock className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                        'transition-colors duration-150',
                        isActive
                          ? 'border-l-2 border-gold bg-gold/10 text-gold'
                          : 'text-muted hover:text-text hover:bg-white/5',
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom plan card */}
        <div className="p-4 border-t border-border">
          <div className="bg-card rounded-lg p-3">
            <p className="text-sm font-semibold text-gold">{subLoading ? '...' : plan.name}</p>
            <p className="text-xs text-muted mt-0.5">
              {subLoading ? '...' : `${daysUntilRenewal} days until renewal`}
            </p>
            {planName !== 'elite' && (
              <Link
                href="/settings?tab=billing"
                className="text-xs font-medium text-gold hover:text-gold-light transition-colors mt-2 inline-block"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  TOP BAR                                                      */}
      {/* ============================================================ */}
      <header className="fixed top-0 left-60 right-0 h-16 bg-deep/80 backdrop-blur-xl border-b border-border z-40 flex items-center justify-between px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">RKV</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted/50" />
          <span className="text-white font-medium">{getBreadcrumb(pathname)}</span>
        </div>

        {/* Right: notification + avatar */}
        <div className="flex items-center gap-4">
          {/* Notification bell */}
          <button
            type="button"
            className="relative p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => router.push('/notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red text-[10px] font-bold text-white px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User avatar dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full',
                'bg-gold/15 text-gold font-semibold text-sm',
                'hover:bg-gold/25 transition-colors cursor-pointer',
                'border border-gold/20',
              )}
            >
              {initials}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-64 bg-card border border-border rounded-xl shadow-card overflow-hidden animate-fade-up">
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {user?.email}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-semibold text-gold bg-gold/10 border border-gold/20 rounded-full px-2 py-0.5">
                    {plan.name} Plan
                  </span>
                </div>
                <div className="p-2">
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-red hover:bg-red/5 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  LOCKED FEATURE ALERT                                         */}
      {/* ============================================================ */}
      {lockedAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-fade-up">
          <div className="flex items-center gap-3 bg-card border border-gold/30 rounded-xl px-5 py-3 shadow-glow">
            <Lock className="h-4 w-4 text-gold flex-shrink-0" />
            <p className="text-sm text-white">
              <span className="font-semibold text-gold">{lockedAlert}</span> requires an upgrade.
            </p>
            <Link
              href="/settings?tab=billing"
              className="text-xs font-semibold text-gold hover:text-gold-light transition-colors whitespace-nowrap"
              onClick={() => setLockedAlert(null)}
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <main className="ml-60 mt-16 min-h-screen bg-black p-8">
        {children}
      </main>
    </div>
  );
}
