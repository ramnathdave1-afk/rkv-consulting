'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  Circle,
  Home,
  Calculator,
  CreditCard,
  Landmark,
  UserCheck,
  Brain,
  Bell,
  ChevronRight,
  Trophy,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GuidedOnboardingProps {
  properties: any[];
  deals: any[];
}

interface ChecklistItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  checkFn: (ctx: CheckContext) => boolean;
}

interface CheckContext {
  properties: any[];
  deals: any[];
  flags: Record<string, boolean>;
}

/* ------------------------------------------------------------------ */
/*  LocalStorage flag helpers                                          */
/* ------------------------------------------------------------------ */

const FLAG_PREFIX = 'rkv_onboarding_';

function getFlags(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const keys = [
      'rent_collection',
      'bank_connected',
      'tenant_screening',
      'iq_reviewed',
      'market_alert',
    ];
    const flags: Record<string, boolean> = {};
    keys.forEach((k) => {
      flags[k] = localStorage.getItem(`${FLAG_PREFIX}${k}`) === 'true';
    });
    return flags;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Checklist items                                                    */
/* ------------------------------------------------------------------ */

const checklistItems: ChecklistItem[] = [
  {
    key: 'add_property',
    label: 'Add your first property',
    icon: <Home className="h-4 w-4" />,
    route: '/properties',
    checkFn: (ctx) => ctx.properties.length > 0,
  },
  {
    key: 'deal_analysis',
    label: 'Run your first deal analysis',
    icon: <Calculator className="h-4 w-4" />,
    route: '/deals',
    checkFn: (ctx) =>
      ctx.deals.some(
        (d: any) =>
          d.analysis ||
          d.deal_score !== undefined ||
          d.noi !== undefined ||
          d.cap_rate !== undefined,
      ),
  },
  {
    key: 'rent_collection',
    label: 'Set up rent collection automation',
    icon: <CreditCard className="h-4 w-4" />,
    route: '/accounting',
    checkFn: (ctx) => !!ctx.flags.rent_collection,
  },
  {
    key: 'bank_connected',
    label: 'Connect your bank account',
    icon: <Landmark className="h-4 w-4" />,
    route: '/accounting',
    checkFn: (ctx) => !!ctx.flags.bank_connected,
  },
  {
    key: 'tenant_screening',
    label: 'Set up tenant screening',
    icon: <UserCheck className="h-4 w-4" />,
    route: '/screening',
    checkFn: (ctx) => !!ctx.flags.tenant_screening,
  },
  {
    key: 'iq_reviewed',
    label: 'Review your Investment IQ score',
    icon: <Brain className="h-4 w-4" />,
    route: '/dashboard',
    checkFn: (ctx) => !!ctx.flags.iq_reviewed,
  },
  {
    key: 'market_alert',
    label: 'Set your first market alert',
    icon: <Bell className="h-4 w-4" />,
    route: '/market',
    checkFn: (ctx) => !!ctx.flags.market_alert,
  },
];

/* ------------------------------------------------------------------ */
/*  Checklist row component                                            */
/* ------------------------------------------------------------------ */

function ChecklistRow({
  item,
  completed,
  index,
  onClick,
}: {
  item: ChecklistItem;
  completed: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={completed}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left group transition-all duration-200',
        completed
          ? 'cursor-default opacity-70'
          : 'hover:bg-white/[0.03] cursor-pointer',
      )}
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Checkbox */}
      <div className="shrink-0">
        {completed ? (
          <CheckCircle2 className="h-5 w-5 text-gold" />
        ) : (
          <Circle className="h-5 w-5 text-muted/40 group-hover:text-muted transition-colors" />
        )}
      </div>

      {/* Icon */}
      <div
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          completed ? 'bg-gold/10' : 'bg-white/[0.03] group-hover:bg-white/[0.06]',
        )}
      >
        <span className={cn(completed ? 'text-gold' : 'text-muted group-hover:text-white transition-colors')}>
          {item.icon}
        </span>
      </div>

      {/* Label */}
      <span
        className={cn(
          'flex-1 text-sm font-body transition-colors',
          completed
            ? 'text-muted line-through'
            : 'text-white group-hover:text-white',
        )}
      >
        {item.label}
      </span>

      {/* Arrow for incomplete */}
      {!completed && (
        <ChevronRight className="h-4 w-4 text-muted/30 group-hover:text-muted transition-colors shrink-0" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function GuidedOnboarding({
  properties,
  deals,
}: GuidedOnboardingProps) {
  const router = useRouter();
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFlags(getFlags());
  }, []);

  const ctx: CheckContext = useMemo(
    () => ({ properties, deals, flags }),
    [properties, deals, flags],
  );

  const completionStatus = useMemo(
    () => checklistItems.map((item) => item.checkFn(ctx)),
    [ctx],
  );

  const completedCount = completionStatus.filter(Boolean).length;
  const totalCount = checklistItems.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const allComplete = completedCount === totalCount;

  const handleClick = useCallback(
    (route: string) => {
      router.push(route);
    },
    [router],
  );

  return (
    <Card padding="none">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {allComplete ? (
              <Trophy className="h-4.5 w-4.5 text-gold" />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(5, 150, 105, 0.1)' }}
              >
                <Brain className="h-4 w-4 text-gold" />
              </div>
            )}
            <h3 className="font-display text-sm font-bold text-white">
              {allComplete ? 'Setup Complete' : 'Your Investment Setup Checklist'}
            </h3>
          </div>
          <Badge
            variant={allComplete ? 'success' : 'default'}
            size="sm"
          >
            {completedCount}/{totalCount}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 rounded-full bg-border/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: allComplete
                ? '#059669'
                : 'linear-gradient(90deg, #059669, #0EA5E9)',
              boxShadow: allComplete
                ? '0 0 12px rgba(5, 150, 105, 0.4)'
                : '0 0 8px rgba(5, 150, 105, 0.2)',
            }}
          />
          {/* Shimmer on the progress bar */}
          {!allComplete && progressPercent > 0 && (
            <div
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{ width: `${progressPercent}%` }}
            >
              <div
                className="h-full w-full animate-shimmer"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                }}
              />
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted mt-1.5 font-mono">
          {allComplete
            ? 'Congratulations! You are all set up and ready to grow.'
            : `${progressPercent}% complete — ${totalCount - completedCount} step${totalCount - completedCount !== 1 ? 's' : ''} remaining`}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: '#161E2A' }} />

      {/* Checklist */}
      <div className="px-2 py-2 space-y-0.5">
        {checklistItems.map((item, i) => (
          <ChecklistRow
            key={item.key}
            item={item}
            completed={completionStatus[i]}
            index={i}
            onClick={() => handleClick(item.route)}
          />
        ))}
      </div>
    </Card>
  );
}

export { GuidedOnboarding };
