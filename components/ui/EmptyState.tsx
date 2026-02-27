'use client';

import React, { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps {
  /** Lucide icon or custom SVG -- rendered in cyan outline style */
  icon?: ReactNode;
  /** Main heading -- rendered in display font */
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
      {/* Icon -- hexagonal container */}
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center',
            'w-16 h-16 mb-5',
            'bg-[#05966912] text-gold',
            'border border-[rgba(5,150,105,0.25)]',
            'rounded-lg',
          )}
        >
          <span className="w-7 h-7 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.5]">
            {icon}
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-display font-semibold text-[18px] text-white mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-[14px] text-muted font-body leading-relaxed mb-6 max-w-sm">
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <Button
          variant="outline"
          onClick={action.onClick}
          icon={
            action.icon ? (
              <span className="shrink-0 flex items-center w-4 h-4 [&>svg]:w-full [&>svg]:h-full">
                {action.icon}
              </span>
            ) : undefined
          }
        >
          {action.label}
        </Button>
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
