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
  default: 'bg-[#1a1a1a] text-[#888] border-[#333]',
  success: 'bg-[rgba(201,168,76,0.08)] text-[#c9a84c] border-[rgba(201,168,76,0.25)]',
  danger: 'bg-[rgba(220,38,38,0.08)] text-[#DC2626] border-[rgba(220,38,38,0.25)]',
  warning: 'bg-[rgba(217,119,6,0.08)] text-[#D97706] border-[rgba(217,119,6,0.25)]',
  info: 'bg-[#1a1a1a] text-[#888] border-[#333]',
  violet: 'bg-[rgba(201,168,76,0.08)] text-[#c9a84c] border-[rgba(201,168,76,0.25)]',
  muted: 'bg-[#1a1a1a] text-[#888] border-[#333]',
  plan: '',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5',
  md: 'px-2.5 py-1',
};

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = Number.parseInt(full, 16);
  // eslint-disable-next-line no-restricted-syntax
  if (Number.isNaN(n) || full.length !== 6) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
          backgroundColor: hexToRgba(planColor, 0.08),
          color: planColor,
          borderColor: hexToRgba(planColor, 0.25),
        }
      : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-body font-semibold text-[11px] rounded-full border',
        'whitespace-nowrap select-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      style={planStyle}
      {...props}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background:
              variant === 'plan' && planColor
                ? planColor
                : variant === 'danger'
                  ? '#DC2626'
                  : variant === 'warning'
                    ? '#D97706'
                    : variant === 'violet'
                      ? '#c9a84c'
                      : variant === 'success'
                        ? '#c9a84c'
                        : '#888',
          }}
        />
      )}
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';

export { Badge };
export default Badge;
