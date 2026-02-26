'use client';

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Variant + size maps                                                */
/* ------------------------------------------------------------------ */

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-gold text-black font-semibold',
    'hover:shadow-glow hover:brightness-110',
    'active:brightness-95',
  ].join(' '),
  secondary: [
    'bg-transparent border border-gold text-gold',
    'hover:bg-gold/10 hover:shadow-glow-sm',
    'active:bg-gold/15',
  ].join(' '),
  ghost: [
    'bg-transparent text-muted',
    'hover:text-white hover:bg-white/5',
    'active:bg-white/10',
  ].join(' '),
  danger: [
    'bg-red text-white font-semibold',
    'hover:bg-red/90 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]',
    'active:bg-red/80',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Button                                                             */
/* ------------------------------------------------------------------ */

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-body',
          'transition-all duration-200 ease-out',
          'select-none whitespace-nowrap',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          // Variant + size
          variantStyles[variant],
          sizeStyles[size],
          // Full width
          fullWidth && 'w-full',
          // Disabled
          isDisabled && 'opacity-50 pointer-events-none cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Spinner className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        ) : icon ? (
          <span className="shrink-0 flex items-center">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export default Button;
