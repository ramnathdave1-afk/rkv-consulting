'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import {
  Bot,
  X,
  Clock,
  AlertTriangle,
  Home,
  DollarSign,
  TrendingUp,
  Lightbulb,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AIConciergeProps {
  properties: any[];
  tenants: any[];
  deals: any[];
  maintenanceRequests: any[];
}

interface AISuggestion {
  id: string;
  type: 'lease' | 'maintenance' | 'rent' | 'deal' | 'tip';
  icon: React.ReactNode;
  headline: string;
  context: string;
  actionLabel: string;
  priority: 'high' | 'medium' | 'low';
}

/* ------------------------------------------------------------------ */
/*  Suggestion generator                                               */
/* ------------------------------------------------------------------ */

function generateSuggestions(
  properties: any[],
  tenants: any[],
  deals: any[],
  maintenanceRequests: any[],
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const now = new Date();

  // Lease expiring within 60 days
  tenants.forEach((tenant: any) => {
    const leaseEnd = tenant.lease_end ? new Date(tenant.lease_end) : null;
    if (!leaseEnd) return;
    const daysUntil = Math.ceil(
      (leaseEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil > 0 && daysUntil <= 60) {
      const address =
        tenant.property_address ||
        tenant.address ||
        properties.find((p: any) => p.id === tenant.property_id)?.address ||
        'your property';
      suggestions.push({
        id: `lease-${tenant.id}`,
        type: 'lease',
        icon: <Home className="h-4 w-4 text-gold" />,
        headline: `Lease at ${address} expires in ${daysUntil} days`,
        context: `${tenant.first_name || tenant.name || 'Tenant'}'s lease is ending soon. Send a renewal offer to avoid vacancy and turnover costs.`,
        actionLabel: 'Send Renewal',
        priority: daysUntil <= 30 ? 'high' : 'medium',
      });
    }
  });

  // Overdue / unresolved maintenance
  maintenanceRequests.forEach((req: any) => {
    const status = req.status?.toLowerCase();
    if (status === 'completed' || status === 'resolved' || status === 'closed') return;
    const created = req.created_at ? new Date(req.created_at) : null;
    if (!created) return;
    const daysOpen = Math.ceil(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysOpen > 7) {
      const address =
        req.property_address ||
        properties.find((p: any) => p.id === req.property_id)?.address ||
        'your property';
      suggestions.push({
        id: `maint-${req.id}`,
        type: 'maintenance',
        icon: <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />,
        headline: `"${req.title || 'Maintenance request'}" is unresolved for ${daysOpen} days`,
        context: `At ${address}. Delayed repairs can lead to tenant dissatisfaction and higher costs.`,
        actionLabel: 'Assign Contractor',
        priority: daysOpen > 14 ? 'high' : 'medium',
      });
    }
  });

  // Rent overdue
  tenants.forEach((tenant: any) => {
    if (
      tenant.rent_status === 'overdue' ||
      tenant.payment_status === 'overdue' ||
      tenant.rent_overdue
    ) {
      const daysLate = Number(tenant.days_overdue) || 5;
      suggestions.push({
        id: `rent-${tenant.id}`,
        type: 'rent',
        icon: <DollarSign className="h-4 w-4 text-red" />,
        headline: `${tenant.first_name || tenant.name || 'A tenant'} is ${daysLate} days late on rent`,
        context: `Send a friendly reminder before initiating formal collection procedures.`,
        actionLabel: 'Send Reminder',
        priority: daysLate > 10 ? 'high' : 'medium',
      });
    }
  });

  // Stale deals (>14 days in same stage)
  deals.forEach((deal: any) => {
    const updated = deal.updated_at ? new Date(deal.updated_at) : null;
    if (!updated) return;
    const daysStale = Math.ceil(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysStale > 14) {
      suggestions.push({
        id: `deal-${deal.id}`,
        type: 'deal',
        icon: <TrendingUp className="h-4 w-4 text-gold-light" />,
        headline: `"${deal.name || deal.title || 'Deal'}" stuck in ${deal.status || 'pipeline'} for ${daysStale} days`,
        context: `Deals that stall often lose momentum. Review and take the next step.`,
        actionLabel: 'Review Deal',
        priority: daysStale > 30 ? 'high' : 'medium',
      });
    }
  });

  // Generic portfolio tip (always show one if we have properties)
  if (properties.length > 0) {
    suggestions.push({
      id: 'tip-portfolio',
      type: 'tip',
      icon: <Lightbulb className="h-4 w-4 text-gold" />,
      headline: 'Review your Investment IQ score',
      context: `Check your score and follow the personalized improvement tips to optimize your portfolio performance.`,
      actionLabel: 'View Score',
      priority: 'low',
    });
  }

  // Sort: high first, then medium, then low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const panelVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, damping: 25, stiffness: 350 },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.2 },
  }),
};

/* ------------------------------------------------------------------ */
/*  Suggestion Card                                                    */
/* ------------------------------------------------------------------ */

function SuggestionCard({
  suggestion,
  index,
  onAction,
  onRemindLater,
  onDismiss,
}: {
  suggestion: AISuggestion;
  index: number;
  onAction: (id: string) => void;
  onRemindLater: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      layout
      className="rounded-lg p-3.5 group/card transition-colors duration-200"
      style={{ background: '#0A0E14', border: '1px solid #1e1e1e' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: '#1e1e1e' }}
        >
          {suggestion.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-white leading-snug">
              {suggestion.headline}
            </p>
            <button
              onClick={() => onDismiss(suggestion.id)}
              className="shrink-0 p-1 rounded text-muted hover:text-white hover:bg-white/5 transition-colors opacity-0 group-hover/card:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {suggestion.context}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <Button
              variant="solid"
              size="sm"
              onClick={() => onAction(suggestion.id)}
            >
              {suggestion.actionLabel}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Clock className="h-3 w-3" />}
              onClick={() => onRemindLater(suggestion.id)}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AIConcierge({
  properties,
  tenants,
  deals,
  maintenanceRequests,
}: AIConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());

  // Load dismissed/snoozed from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rkv_concierge_dismissed');
      if (stored) setDismissed(new Set(JSON.parse(stored)));
      const storedSnoozed = localStorage.getItem('rkv_concierge_snoozed');
      if (storedSnoozed) setSnoozed(new Set(JSON.parse(storedSnoozed)));
    } catch {
      // ignore
    }
  }, []);

  const allSuggestions = useMemo(
    () => generateSuggestions(properties, tenants, deals, maintenanceRequests),
    [properties, tenants, deals, maintenanceRequests],
  );

  const visibleSuggestions = useMemo(
    () =>
      allSuggestions.filter(
        (s) => !dismissed.has(s.id) && !snoozed.has(s.id),
      ),
    [allSuggestions, dismissed, snoozed],
  );

  const count = visibleSuggestions.length;

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(
            'rkv_concierge_dismissed',
            JSON.stringify(Array.from(next)),
          );
        } catch {
          // ignore
        }
        return next;
      });
    },
    [],
  );

  const handleRemindLater = useCallback(
    (id: string) => {
      setSnoozed((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(
            'rkv_concierge_snoozed',
            JSON.stringify(Array.from(next)),
          );
        } catch {
          // ignore
        }
        return next;
      });
      toast.info('Reminder snoozed. It will reappear on your next session.');
    },
    [],
  );

  const handleAction = useCallback(
    (id: string) => {
      const suggestion = allSuggestions.find((s) => s.id === id);
      if (!suggestion) return;

      toast.success(
        `Action initiated: ${suggestion.actionLabel}. We'll guide you through the next steps.`,
      );
      handleDismiss(id);
    },
    [allSuggestions, handleDismiss],
  );

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'shadow-glow-lg transition-all duration-300',
          'hover:scale-105 active:scale-95',
          isOpen
            ? 'bg-card border border-border'
            : 'bg-gold text-black',
        )}
        style={
          !isOpen
            ? {
                boxShadow:
                  '0 0 30px rgba(201, 168, 76, 0.3), 0 4px 20px rgba(0, 0, 0, 0.4)',
              }
            : undefined
        }
        aria-label={isOpen ? 'Close AI suggestions' : 'Open AI suggestions'}
      >
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted" />
        ) : (
          <Bot className="h-6 w-6" />
        )}
        {/* Notification badge */}
        {!isOpen && count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center">
            <span className="absolute inline-flex h-5 w-5 rounded-full bg-red opacity-75 animate-ping" />
            <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-red text-white text-[10px] font-bold font-mono">
              {count > 9 ? '9+' : count}
            </span>
          </span>
        )}
      </button>

      {/* Slide-up panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-24 right-6 z-50 w-96 max-h-[70vh] rounded-lg overflow-hidden flex flex-col"
            style={{
              background: '#111111',
              border: '1px solid #1e1e1e',
              boxShadow:
                '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(201, 168, 76, 0.05)',
            }}
          >
            {/* Panel Header */}
            <div
              className="px-4 py-3.5 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid #1e1e1e' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(201, 168, 76, 0.15)' }}
                >
                  <Sparkles className="h-4 w-4 text-gold" />
                </div>
                <span className="font-display text-sm font-bold text-white">
                  AI Suggestions
                </span>
                {count > 0 && (
                  <Badge variant="default" size="sm">
                    {count}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {visibleSuggestions.length > 0 ? (
                  visibleSuggestions.map((suggestion, i) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      index={i}
                      onAction={handleAction}
                      onRemindLater={handleRemindLater}
                      onDismiss={handleDismiss}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                      style={{ background: 'rgba(201, 168, 76, 0.1)' }}
                    >
                      <Sparkles className="h-6 w-6 text-gold" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">
                      All clear
                    </p>
                    <p className="text-xs text-muted max-w-[240px]">
                      No suggestions right now. Your portfolio is running smoothly.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { AIConcierge };
