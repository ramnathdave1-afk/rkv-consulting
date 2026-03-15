'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Zap, Database, Shield, Activity } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/store/notification-store';
import { cn } from '@/lib/utils';

const agentColors: Record<string, string> = {
  alpha: '#00D4AA',
  beta: '#3B82F6',
  gamma: '#F59E0B',
  delta: '#8A00FF',
  epsilon: '#A855F7',
  zeta: '#06B6D4',
};

const typeIcons = {
  agent: Zap,
  ingestion: Database,
  feasibility: Shield,
  system: Activity,
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function groupNotifications(notifications: Notification[]) {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  for (const n of notifications) {
    const ts = n.timestamp.getTime();
    if (ts >= todayStart.getTime()) today.push(n);
    else if (ts >= yesterdayStart.getTime()) yesterday.push(n);
    else earlier.push(n);
  }

  return { today, yesterday, earlier };
}

export function NotificationDropdown() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const dropdownOpen = useNotificationStore((s) => s.dropdownOpen);
  const setDropdownOpen = useNotificationStore((s) => s.setDropdownOpen);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, setDropdownOpen]);

  const grouped = groupNotifications(notifications);

  const renderGroup = (label: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
        {items.map((n) => {
          const Icon = typeIcons[n.type];
          const color = n.agentName ? agentColors[n.agentName] : undefined;
          return (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={cn(
                'flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-bg-elevated/50 transition-colors',
                !n.read && 'bg-accent/5',
              )}
            >
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: `${color || '#6B7280'}15` }}
              >
                <Icon size={12} style={{ color: color || '#6B7280' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-medium text-text-primary truncate">{n.title}</p>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[9px] text-text-muted/60 mt-0.5">{formatRelativeTime(n.timestamp)}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative rounded-lg p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'tween', duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-bg-primary/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-xs font-semibold text-text-primary">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors"
                >
                  <Check size={10} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell size={20} className="text-text-muted/40 mb-2" />
                  <p className="text-xs text-text-muted">No notifications yet</p>
                </div>
              ) : (
                <>
                  {renderGroup('Today', grouped.today)}
                  {renderGroup('Yesterday', grouped.yesterday)}
                  {renderGroup('Earlier', grouped.earlier)}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
