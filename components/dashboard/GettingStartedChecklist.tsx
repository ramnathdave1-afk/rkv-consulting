'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

const HIDE_KEY = 'rkv.gettingStartedDismissed';

/**
 * Collapsible checklist that surfaces during the user's first 30 days.
 * Auto-detects what's done by querying live tables — never lies about state.
 */
export function GettingStartedChecklist() {
  const supabase = createClient();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(HIDE_KEY) === '1') {
      setHidden(true);
      return;
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, created_at, onboarding_data')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile?.org_id) {
        setLoading(false);
        return;
      }

      if (profile.created_at) setCreatedAt(new Date(profile.created_at));

      const orgId = profile.org_id;

      // Helper that swallows missing-table errors so the checklist still works
      // before optional tables exist.
      const safeCount = async (table: string): Promise<number> => {
        try {
          const { count } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId);
          return count ?? 0;
        } catch {
          return 0;
        }
      };

      const [
        { data: org },
        { count: realPropertyCount },
        { count: invitationCount },
        integrationCount,
        convoCount,
        reportCount,
      ] = await Promise.all([
        supabase
          .from('organizations')
          .select('brand_name, brand_primary_color, brand_logo_url')
          .eq('id', orgId)
          .maybeSingle(),
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .not('metadata->>demo', 'eq', 'true'),
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId),
        safeCount('integrations'),
        safeCount('conversations'),
        safeCount('owner_reports'),
      ]);

      const brandingDone = Boolean(
        org?.brand_name || org?.brand_logo_url || org?.brand_primary_color,
      );

      setItems([
        { id: 'org', label: 'Created organization', done: true },
        { id: 'branding', label: 'Set up branding', done: brandingDone, href: '/settings/branding' },
        {
          id: 'property',
          label: 'Add first real property',
          done: (realPropertyCount ?? 0) > 0,
          href: '/properties',
        },
        {
          id: 'invite',
          label: 'Invite a team member',
          done: (invitationCount ?? 0) > 0,
          href: '/settings/team',
        },
        {
          id: 'integration',
          label: 'Connect a PM platform integration',
          done: integrationCount > 0,
          href: '/integrations',
        },
        {
          id: 'ai_message',
          label: 'Send first AI-powered tenant communication',
          done: convoCount > 0,
          href: '/conversations',
        },
        {
          id: 'report',
          label: 'Generate first owner report',
          done: reportCount > 0,
          href: '/reports',
        },
      ]);
      setLoading(false);
    })();
  }, [supabase]);

  if (hidden || loading || items.length === 0) return null;

  const allDone = items.every((i) => i.done);
  const completed = items.filter((i) => i.done).length;
  const ageDays = createdAt
    ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Auto-hide after 30 days OR when everything is checked off.
  if (allDone || ageDays > 30) return null;

  function dismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HIDE_KEY, '1');
    }
    setHidden(true);
  }

  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
            {completed}/{items.length}
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">Getting Started</div>
            <div className="text-xs text-text-muted">
              {completed === items.length
                ? "You're all set!"
                : `${items.length - completed} steps to unlock the full platform`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-text-muted hover:text-text-primary"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-text-muted hover:text-text-primary"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-1 overflow-hidden"
          >
            {items.map((item) => (
              <li key={item.id}>
                {item.href && !item.done ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-bg-elevated transition-colors text-sm text-text-primary"
                  >
                    <Indicator done={item.done} />
                    <span className={cn(item.done && 'line-through text-text-muted')}>
                      {item.label}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-text-primary">
                    <Indicator done={item.done} />
                    <span className={cn(item.done && 'line-through text-text-muted')}>
                      {item.label}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Indicator({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        'h-4 w-4 rounded-full flex items-center justify-center text-bg-primary',
        done ? 'bg-accent' : 'border border-border',
      )}
    >
      {done && <Check size={10} strokeWidth={3} />}
    </div>
  );
}

export default GettingStartedChecklist;
