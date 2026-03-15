'use client';

import React, { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'violet' | 'muted' | 'accent';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  color?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-elevated text-text-secondary border-border',
  success: 'bg-success-muted text-success border-[rgba(34,197,94,0.25)]',
  danger: 'bg-danger-muted text-danger border-[rgba(239,68,68,0.25)]',
  warning: 'bg-warning-muted text-warning border-[rgba(245,158,11,0.25)]',
  info: 'bg-blue-muted text-blue border-[rgba(59,130,246,0.25)]',
  violet: 'bg-violet-muted text-violet border-[rgba(138,0,255,0.25)]',
  muted: 'bg-bg-elevated text-text-muted border-border',
  accent: 'bg-accent-muted text-accent border-border-accent',
};

const dotColors: Record<BadgeVariant, string> = {
  default: '#8B95A5',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  violet: '#8A00FF',
  muted: '#4A5568',
  accent: '#00D4AA',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
};

function Badge({ variant = 'default', size = 'md', dot = false, color, className, children, style, ...props }: BadgeProps) {
  const customStyle = color
    ? { backgroundColor: `${color}20`, color, borderColor: `${color}40`, ...style }
    : style;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full border whitespace-nowrap select-none',
        !color && variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      style={customStyle}
      {...props}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: color || dotColors[variant] }}
        />
      )}
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';
export { Badge };
export default Badge;
