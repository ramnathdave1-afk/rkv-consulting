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

/* ── Opaque fills for light mode ── */
const variantFills: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)' },
  success: { bg: '#E6F7EF', text: '#0D6B3A' },
  danger:  { bg: '#FDE8E8', text: '#B91C1C' },
  warning: { bg: '#FFF3D6', text: '#92610A' },
  info:    { bg: '#E8F0FE', text: '#1D4ED8' },
  violet:  { bg: '#F3E8FF', text: '#7C3AED' },
  muted:   { bg: 'var(--bg-hover)', text: 'var(--text-tertiary)' },
  accent:  { bg: '#E6F7F1', text: '#0D7353' },
};

/* ── Opaque fills for dark mode ── */
const variantFillsDark: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)' },
  success: { bg: '#0D3D2E', text: '#34D399' },
  danger:  { bg: '#3D1515', text: '#F87171' },
  warning: { bg: '#3D2E0A', text: '#FBBF24' },
  info:    { bg: '#1A2744', text: '#60A5FA' },
  violet:  { bg: '#2D1A4E', text: '#A855F7' },
  muted:   { bg: 'var(--bg-hover)', text: 'var(--text-tertiary)' },
  accent:  { bg: '#0D3D2E', text: '#34D399' },
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'var(--text-tertiary)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--info)',
  violet: 'var(--violet)',
  muted: 'var(--text-tertiary)',
  accent: 'var(--accent)',
};

const sizeStyles: Record<BadgeSize, { height: string; padding: string; fontSize: string }> = {
  sm: { height: '18px', padding: '0 6px', fontSize: '10px' },
  md: { height: '20px', padding: '0 8px', fontSize: '11px' },
};

function Badge({ variant = 'default', size = 'md', dot = false, color, className, children, style: styleProp, ...props }: BadgeProps) {
  const fills = variantFills[variant];
  const darkFills = variantFillsDark[variant];
  const dims = sizeStyles[size];

  const customStyle: React.CSSProperties = color
    ? {
        backgroundColor: `${color}20`,
        color,
        height: dims.height,
        padding: dims.padding,
        fontSize: dims.fontSize,
        ...styleProp,
      }
    : {
        backgroundColor: fills.bg,
        color: fills.text,
        height: dims.height,
        padding: dims.padding,
        fontSize: dims.fontSize,
        ...styleProp,
      };

  /* Generate a stable class name for dark mode */
  const darkClass = `badge-${variant}`;

  return (
    <>
      {!color && (
        <style>{`
          [data-theme="dark"] .${darkClass},
          .dark .${darkClass} {
            background-color: ${darkFills.bg} !important;
            color: ${darkFills.text} !important;
          }
        `}</style>
      )}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap select-none',
          !color && darkClass,
          className,
        )}
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          lineHeight: dims.height,
          ...customStyle,
        }}
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
    </>
  );
}

Badge.displayName = 'Badge';
export { Badge };
export default Badge;
