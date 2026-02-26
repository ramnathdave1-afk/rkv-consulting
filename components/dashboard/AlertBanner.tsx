'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
  dismissible?: boolean;
}

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

const alertConfig: Record<
  Alert['type'],
  { icon: LucideIcon; border: string; bg: string; iconColor: string }
> = {
  warning: {
    icon: AlertTriangle,
    border: 'border-gold/40',
    bg: 'bg-gold/5',
    iconColor: 'text-gold',
  },
  danger: {
    icon: XCircle,
    border: 'border-red/40',
    bg: 'bg-red/5',
    iconColor: 'text-red',
  },
  info: {
    icon: Info,
    border: 'border-muted/40',
    bg: 'bg-muted/5',
    iconColor: 'text-muted',
  },
  success: {
    icon: CheckCircle,
    border: 'border-green/40',
    bg: 'bg-green/5',
    iconColor: 'text-green',
  },
};

export default function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissedIds((prev) => { const next = new Set(Array.from(prev)); next.add(id); return next; });
      onDismiss?.(id);
    },
    [onDismiss],
  );

  const visibleAlerts = alerts.filter(
    (alert) => !dismissedIds.has(alert.id),
  );

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert) => {
          const config = alertConfig[alert.type];
          const IconComponent = config.icon;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{
                duration: 0.25,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <div
                className={cn(
                  'flex items-center gap-4 rounded-xl border px-5 py-4',
                  'bg-card',
                  config.border,
                )}
              >
                {/* Type icon */}
                <div className="flex-shrink-0">
                  <IconComponent
                    className={cn('h-5 w-5', config.iconColor)}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {alert.title}
                  </p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {alert.message}
                  </p>
                </div>

                {/* Action button */}
                {alert.action && alert.actionLabel && (
                  <button
                    onClick={alert.action}
                    className={cn(
                      'flex-shrink-0 rounded-lg px-4 py-1.5',
                      'text-xs font-semibold',
                      'bg-gold/10 text-gold',
                      'hover:bg-gold/20 transition-colors duration-150',
                      'cursor-pointer',
                    )}
                  >
                    {alert.actionLabel}
                  </button>
                )}

                {/* Dismiss button */}
                {alert.dismissible !== false && (
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className={cn(
                      'flex-shrink-0 rounded-lg p-1.5',
                      'text-muted hover:text-white',
                      'hover:bg-border/50 transition-colors duration-150',
                      'cursor-pointer',
                    )}
                    aria-label={`Dismiss ${alert.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
