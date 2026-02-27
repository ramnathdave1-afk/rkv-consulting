'use client';

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'glass' | 'hud';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  header?: ReactNode;
  footer?: ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const variantStyles: Record<CardVariant, string> = {
  default: '',
  elevated: '',
  interactive: 'cursor-pointer',
  glass: 'glass',
  hud: '',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      header,
      footer,
      className,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg overflow-hidden glow-border card-hover',
          variantStyles[variant],
          // Only apply padding to the wrapper when there is no header/footer
          !header && !footer && paddingStyles[padding],
          className,
        )}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          ...style,
        }}
        {...props}
      >
        {header && (
          <div
            className={cn(
              'border-b',
              paddingStyles[padding === 'none' ? 'md' : padding],
            )}
            style={{ borderColor: '#161E2A' }}
          >
            {header}
          </div>
        )}

        {header || footer ? (
          <div className={cn(paddingStyles[padding])}>{children}</div>
        ) : (
          children
        )}

        {footer && (
          <div
            className={cn(
              'border-t',
              paddingStyles[padding === 'none' ? 'md' : padding],
            )}
            style={{ borderColor: '#161E2A' }}
          >
            {footer}
          </div>
        )}
      </div>
    );
  },
);

Card.displayName = 'Card';

export { Card };
export default Card;
