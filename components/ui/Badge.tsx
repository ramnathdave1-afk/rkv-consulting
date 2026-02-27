'use client';

import React, { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'violet'
  | 'muted'
  | 'plan';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  /** Plan color - only used when variant is "plan" */
  planColor?: string;
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gold/10 text-gold border-gold/20',
  success: 'bg-green/10 text-green border-green/20',
  danger: 'bg-red/10 text-red border-red/20',
  warning: 'bg-gold-light/10 text-gold-light border-gold-light/20',
  info: 'bg-gold/10 text-gold border-gold/20',
  violet: 'bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/20',
  muted: 'bg-muted/10 text-muted border-muted/20',
  plan: '', // dynamically set
};

const dotColorMap: Record<BadgeVariant, string> = {
  default: 'bg-gold',
  success: 'bg-green',
  danger: 'bg-red',
  warning: 'bg-gold-light',
  info: 'bg-gold',
  violet: 'bg-[#0EA5E9]',
  muted: 'bg-muted',
  plan: 'bg-gold',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[10px]',
};

/* ------------------------------------------------------------------ */
/*  Badge                                                              */
/* ------------------------------------------------------------------ */

function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  planColor,
  className,
  children,
  ...props
}: BadgeProps) {
  const planStyle =
    variant === 'plan' && planColor
      ? {
          backgroundColor: `${planColor}20`,
          color: planColor,
          borderColor: `${planColor}33`,
        }
      : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-body font-medium rounded border',
        'whitespace-nowrap select-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      style={planStyle}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              variant === 'plan' ? '' : dotColorMap[variant],
            )}
            style={
              variant === 'plan' && planColor
                ? { backgroundColor: planColor }
                : undefined
            }
          />
          <span
            className={cn(
              'relative inline-flex rounded-full h-1.5 w-1.5',
              variant === 'plan' ? '' : dotColorMap[variant],
            )}
            style={
              variant === 'plan' && planColor
                ? { backgroundColor: planColor }
                : undefined
            }
          />
        </span>
      )}
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';

export { Badge };
export default Badge;
