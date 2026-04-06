'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  MessageSquareText,
  Wrench,
  WrenchIcon,
  DollarSign,
  FileText,
  Send,
  Calendar,
  CalendarCheck,
  UserPlus,
  Building2,
  Megaphone,
  TrendingUp,
  Bot,
  Truck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

interface ActivityEntry {
  id: string;
  org_id: string;
  event_type: string;
  title: string;
  description: string | null;
  severity: 'info' | 'success' | 'warning' | 'critical';
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

interface ActivityFeedProps {
  maxItems?: number;
  compact?: boolean;
  filterType?: string | null;
}

// ── Icon + Color mapping ──

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  call_inbound:        { icon: PhoneIncoming,    color: '#3B82F6' },
  call_outbound:       { icon: PhoneOutgoing,    color: '#3B82F6' },
  sms_inbound:         { icon: MessageSquare,    color: '#06B6D4' },
  sms_outbound:        { icon: MessageSquareText,color: '#06B6D4' },
  maintenance_created: { icon: Wrench,           color: '#F59E0B' },
  maintenance_updated: { icon: WrenchIcon,       color: '#F59E0B' },
  rent_payment:        { icon: DollarSign,       color: '#22C55E' },
  lease_expiring:      { icon: FileText,         color: '#A855F7' },
  lease_renewal_sent:  { icon: Send,             color: '#A855F7' },
  showing_scheduled:   { icon: Calendar,         color: '#00D4AA' },
  showing_completed:   { icon: CalendarCheck,    color: '#00D4AA' },
  work_order_assigned: { icon: Truck,            color: '#F59E0B' },
  work_order_completed:{ icon: CheckCircle2,     color: '#22C55E' },
  collection_action:   { icon: AlertTriangle,    color: '#EF4444' },
  move_in_created:     { icon: UserPlus,         color: '#00D4AA' },
  campaign_sent:       { icon: Megaphone,        color: '#8A00FF' },
  deal_stage_change:   { icon: TrendingUp,       color: '#00D4AA' },
  ai_conversation:     { icon: Bot,              color: '#3B82F6' },
  tenant_created:      { icon: UserPlus,         color: '#22C55E' },
  property_added:      { icon: Building2,        color: '#00D4AA' },
};

const SEVERITY_STYLES: Record<string, string> = {
  info: '',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const ENTITY_ROUTES: Record<string, string> = {
  conversation: '/conversations',
  work_order: '/work-orders',
  lease: '/leases',
  tenant: '/tenants',
  property: '/properties',
  deal: '/acquisitions',
  campaign: '/campaigns',
  showing: '/showings',
  payment: '/delinquency',
};

function getRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

export function ActivityFeed({ maxItems = 20, compact = false, filterType = null }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchActivity = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(maxItems) });
      if (filterType) params.set('type', filterType);
      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('Activity fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [maxItems, filterType]);

  useEffect(() => {
    fetchActivity();

    // Real-time subscription
    const channel = supabase
      .channel('activity-feed-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newEntry = payload.new as ActivityEntry;
          setEntries((prev) => {
            const updated = [newEntry, ...prev];
            return updated.slice(0, maxItems);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'activity_feed' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const updated = payload.new as ActivityEntry;
          setEntries((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchActivity, maxItems]);

  const handleClick = async (entry: ActivityEntry) => {
    // Mark as read
    if (!entry.read) {
      fetch(`/api/activity/${entry.id}`, { method: 'PATCH' });
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, read: true } : e))
      );
    }
    // Navigate
    if (entry.entity_type && ENTITY_ROUTES[entry.entity_type]) {
      window.location.href = ENTITY_ROUTES[entry.entity_type];
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/5" />
              <div className="h-2.5 w-1/2 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Phone size={24} className="text-text-muted/30 mb-3" />
        <p className="text-sm text-text-muted">No activity yet</p>
        <p className="text-xs text-text-muted/60 mt-1">Events will appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-0.5', compact ? 'max-h-[400px]' : 'max-h-[600px]', 'overflow-y-auto scrollbar-thin')}>
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const config = EVENT_CONFIG[entry.event_type] || { icon: Phone, color: '#6B7280' };
          const Icon = config.icon;
          const isClickable = !!(entry.entity_type && ENTITY_ROUTES[entry.entity_type]);

          return (
            <motion.button
              key={entry.id}
              initial={{ opacity: 0, x: -12, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 12, height: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => handleClick(entry)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150',
                'hover:bg-white/[0.03]',
                !entry.read && 'bg-accent/[0.03]',
                isClickable && 'cursor-pointer',
              )}
            >
              {/* Icon */}
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${config.color}12` }}
              >
                <Icon size={14} style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-[12px] font-medium truncate',
                    entry.read ? 'text-text-secondary' : 'text-text-primary',
                  )}>
                    {entry.title}
                  </p>
                  {!entry.read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0 animate-pulse" />
                  )}
                  {(entry.severity === 'warning' || entry.severity === 'critical') && (
                    <span className={cn(
                      'shrink-0 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full border',
                      SEVERITY_STYLES[entry.severity],
                    )}>
                      {entry.severity}
                    </span>
                  )}
                </div>
                {entry.description && (
                  <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
                    {entry.description}
                  </p>
                )}
                <p className="text-[10px] text-text-muted/50 mt-1">
                  {getRelativeTime(entry.created_at)}
                </p>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
