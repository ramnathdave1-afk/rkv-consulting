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
  elevated: 'shadow-card',
  interactive: [
    'hover:scale-[1.01] hover:shadow-glow hover:border-gold/20',
    'transition-all duration-300 ease-out cursor-pointer',
  ].join(' '),
  glass: [
    'backdrop-blur-xl !border-white/5',
    'shadow-card',
  ].join(' '),
  hud: 'rounded-lg',
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
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg overflow-hidden glow-border',
          variantStyles[variant],
          // Only apply padding to the wrapper when there is no header/footer
          !header && !footer && paddingStyles[padding],
          className,
        )}
        style={{
          background: '#0C1018',
          border: '1px solid #161E2A',
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
