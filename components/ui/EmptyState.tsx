'use client';

import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps {
  /** Lucide icon or custom SVG -- rendered in gold outline style */
  icon?: ReactNode;
  /** Main heading -- rendered in Syne display font */
  title: string;
  /** Supporting copy */
  description?: string;
  /** Primary CTA */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Fully custom content below the description */
  children?: ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  EmptyState                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-16 px-6 max-w-md mx-auto',
        className,
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center',
            'w-16 h-16 rounded-2xl mb-5',
            'bg-gold/10 text-gold',
            'border border-gold/20',
          )}
        >
          <span className="w-7 h-7 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.5]">
            {icon}
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-display font-semibold text-lg text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted font-body leading-relaxed mb-6 max-w-sm">
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'h-10 px-5 rounded-lg text-sm font-semibold font-body',
            'bg-gold text-black',
            'hover:brightness-110 hover:shadow-glow',
            'active:brightness-95',
            'transition-all duration-200 ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          )}
        >
          {action.icon && (
            <span className="shrink-0 flex items-center w-4 h-4 [&>svg]:w-full [&>svg]:h-full">
              {action.icon}
            </span>
          )}
          {action.label}
        </button>
      )}

      {/* Custom content */}
      {children && <div className="mt-4 w-full">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Display name                                                       */
/* ------------------------------------------------------------------ */

EmptyState.displayName = 'EmptyState';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { EmptyState };
export default EmptyState;
