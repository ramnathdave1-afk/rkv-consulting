'use client';

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'glass';
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
  default: 'bg-card border border-border',
  elevated: 'bg-card/90 border border-border shadow-card',
  interactive: [
    'bg-card border border-border',
    'hover:scale-[1.01] hover:shadow-glow hover:border-gold/20',
    'transition-all duration-300 ease-out cursor-pointer',
  ].join(' '),
  glass: [
    'bg-card/40 backdrop-blur-xl border border-white/5',
    'shadow-card',
  ].join(' '),
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
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
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl overflow-hidden',
          variantStyles[variant],
          // Only apply padding to the wrapper when there is no header/footer
          !header && !footer && paddingStyles[padding],
          className,
        )}
        {...props}
      >
        {header && (
          <div
            className={cn(
              'border-b border-border',
              paddingStyles[padding === 'none' ? 'md' : padding],
            )}
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
              'border-t border-border',
              paddingStyles[padding === 'none' ? 'md' : padding],
            )}
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
