'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  DollarSign,
  AlertTriangle,
  FileText,
  Wrench,
  Bot,
  TrendingUp,
  Settings,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useNotifications from '@/hooks/useNotifications';

/* ------------------------------------------------------------------ */
/*  Notification type config                                           */
/* ------------------------------------------------------------------ */

const NOTIFICATION_TYPES: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; route?: string }
> = {
  payment: {
    icon: DollarSign,
    color: 'text-green',
    bg: 'bg-green/10',
    route: '/tenants',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-red',
    bg: 'bg-red/10',
    route: '/tenants',
  },
  lease: {
    icon: FileText,
    color: 'text-gold',
    bg: 'bg-gold/10',
    route: '/tenants',
  },
  maintenance: {
    icon: Wrench,
    color: 'text-gold',
    bg: 'bg-gold/10',
    route: '/maintenance',
  },
  agent: {
    icon: Bot,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    route: '/ai-agents',
  },
  market: {
    icon: TrendingUp,
    color: 'text-gold',
    bg: 'bg-gold/10',
    route: '/market-intelligence',
  },
  system: {
    icon: Settings,
    color: 'text-muted',
    bg: 'bg-muted/10',
    route: '/settings',
  },
};

/* ------------------------------------------------------------------ */
/*  Time ago helper                                                    */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  NotificationCenter                                                 */
/* ------------------------------------------------------------------ */

export default function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } =
    useNotifications();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  function handleNotificationClick(notifId: string, type: string) {
    markAsRead.mutate(notifId);
    const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.system;
    if (config.route) {
      router.push(config.route);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'relative flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'bg-card border border-border',
          'text-muted hover:text-white hover:border-gold/30',
          'transition-all duration-200',
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1',
              'flex items-center justify-center',
              'min-w-[18px] h-[18px] px-1 rounded-full',
              'bg-red text-white text-[10px] font-bold',
              'animate-pulse',
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-12 z-50',
            'w-[380px] max-h-[480px]',
            'glass border border-border rounded-xl',
            'shadow-2xl shadow-black/40',
            'overflow-hidden rounded-lg',
            'animate-fade-up',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="label">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gold/15 text-gold text-[10px] font-bold font-mono">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead.mutate()}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-gold hover:bg-gold/10 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[400px]">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-border" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-border rounded w-3/4" />
                      <div className="h-2.5 bg-border rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="w-8 h-8 text-muted/30 mb-3" />
                <p className="text-sm text-muted">No notifications yet</p>
                <p className="text-xs text-muted/60 mt-1">
                  You&apos;ll see updates here as they happen
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const config =
                  NOTIFICATION_TYPES[notif.type] || NOTIFICATION_TYPES.system;
                const Icon = config.icon;

                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() =>
                      handleNotificationClick(notif.id, notif.type)
                    }
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3',
                      'text-left transition-colors',
                      'hover:bg-white/[0.03]',
                      !notif.read && 'bg-gold/[0.03]',
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex items-center justify-center',
                        'w-8 h-8 rounded-lg flex-shrink-0',
                        config.bg,
                      )}
                    >
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm leading-snug font-body',
                          notif.read ? 'text-muted' : 'text-white',
                        )}
                      >
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-muted mt-0.5 truncate">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted/60 mt-1 font-mono">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notif.read && (
                      <span className="pulse-dot flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
