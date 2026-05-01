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
 * Sales Intelligence Dashboard styled checklist.
 * White surface, sky-700 complete state, slate-300 pending borders.
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

  if (allDone || ageDays > 30) return null;

  function dismiss() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(HIDE_KEY, '1');
    }
    setHidden(true);
  }

  const pct = Math.round((completed / items.length) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-sky-50 text-[#0369A1] flex items-center justify-center text-xs font-bold tabular-nums">
            {completed}/{items.length}
          </div>
          <div>
            <div className="text-sm font-semibold text-[#020617]">Getting Started</div>
            <div className="text-xs text-slate-500">
              {completed === items.length
                ? "You're all set!"
                : `${items.length - completed} steps to unlock the full platform`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-slate-500 hover:text-[#020617] transition-colors"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-slate-500 hover:text-[#020617] transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[#0369A1]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 space-y-1 overflow-hidden"
          >
            {items.map((item) => (
              <li key={item.id}>
                {item.href && !item.done ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50 transition-colors text-sm text-[#020617]"
                  >
                    <Indicator done={item.done} />
                    <span className={cn(item.done && 'line-through text-slate-400')}>
                      {item.label}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-[#020617]">
                    <Indicator done={item.done} />
                    <span className={cn(item.done && 'line-through text-slate-400')}>
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
        'h-4 w-4 rounded-full flex items-center justify-center transition-colors',
        done ? 'bg-[#0369A1] text-white' : 'border border-slate-300 bg-white',
      )}
    >
      {done && <Check size={10} strokeWidth={3} />}
    </div>
  );
}

export default GettingStartedChecklist;
