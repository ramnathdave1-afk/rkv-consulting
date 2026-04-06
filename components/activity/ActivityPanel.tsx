'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Bell, Filter } from 'lucide-react';
import { ActivityFeed } from './ActivityFeed';
import { cn } from '@/lib/utils';

interface ActivityPanelProps {
  open: boolean;
  onClose: () => void;
}

const FILTER_TABS = [
  { label: 'All', value: null },
  { label: 'Calls', value: 'call_inbound' },
  { label: 'Maintenance', value: 'maintenance_created' },
  { label: 'Payments', value: 'rent_payment' },
  { label: 'Leases', value: 'lease_expiring' },
  { label: 'Critical', value: '__critical__' },
] as const;

export function ActivityPanel({ open, onClose }: ActivityPanelProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingRead(true);
    try {
      await fetch('/api/activity/mark-read', { method: 'POST' });
      // Force re-render by toggling filter
      setActiveFilter((prev) => prev);
      window.dispatchEvent(new CustomEvent('activity-mark-all-read'));
    } catch (err) {
      console.error('Mark all read error:', err);
    } finally {
      setMarkingRead(false);
    }
  }, []);

  // Determine effective filter for the feed
  const effectiveFilter = activeFilter === '__critical__' ? null : activeFilter;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-[#06080C]/95 backdrop-blur-xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Bell size={14} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Activity Feed</h2>
                  <p className="text-[10px] text-text-muted">Real-time platform events</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingRead}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                >
                  <Check size={12} />
                  Mark All Read
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-white/5 hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5 border-b border-border px-5 py-3 overflow-x-auto scrollbar-none">
              <Filter size={12} className="text-text-muted shrink-0 mr-1" />
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveFilter(tab.value)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150',
                    activeFilter === tab.value
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'text-text-muted hover:text-text-secondary hover:bg-white/5 border border-transparent',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <ActivityFeed maxItems={50} filterType={effectiveFilter} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
