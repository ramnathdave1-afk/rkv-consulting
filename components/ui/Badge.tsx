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
  default: 'bg-[#161E2A] text-[#64748B] border-[#2A3A50]',
  success: 'bg-[#05966915] text-[#059669] border-[#05966940]',
  danger: 'bg-[#DC262615] text-[#DC2626] border-[#DC262640]',
  warning: 'bg-[#D9770615] text-[#D97706] border-[#D9770640]',
  info: 'bg-[#161E2A] text-[#64748B] border-[#2A3A50]',
  violet: 'bg-[#0EA5E915] text-[#0EA5E9] border-[#0EA5E940]', // Premium
  muted: 'bg-[#161E2A] text-[#64748B] border-[#2A3A50]',
  plan: '', // dynamically set
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
                      ? '#0EA5E9'
                      : variant === 'success'
                        ? '#059669'
                        : '#64748B',
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
