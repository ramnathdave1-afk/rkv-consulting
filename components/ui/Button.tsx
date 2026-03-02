'use client';

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ButtonVariant = 'primary' | 'solid' | 'ghost' | 'outline' | 'danger';
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
    'bg-[#c9a84c] text-black',
    'hover:bg-[#b8943f]',
    'active:scale-[0.97]',
  ].join(' '),
  solid: [
    'bg-[#c9a84c] text-black',
    'hover:bg-[#b8943f]',
    'active:scale-[0.97]',
  ].join(' '),
  outline: [
    'bg-transparent border border-[#c9a84c] text-[#c9a84c]',
    'hover:bg-[rgba(201,168,76,0.08)]',
    'active:scale-[0.97]',
  ].join(' '),
  ghost: [
    'bg-transparent border border-[#1e1e1e] text-[#888]',
    'hover:border-[#333] hover:text-white',
    'active:scale-[0.97]',
  ].join(' '),
  danger: [
    'bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.25)] text-red',
    'hover:bg-[rgba(220,38,38,0.10)]',
    'active:scale-[0.97]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[13px] gap-2 rounded-[6px]',
  md: 'h-10 px-5 text-[13px] gap-2 rounded-[6px]',
  lg: 'h-11 px-6 text-[13px] gap-2.5 rounded-[6px]',
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
          'inline-flex items-center justify-center font-body font-semibold',
          'transition-all duration-150 ease-out',
          'select-none whitespace-nowrap',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,168,76,0.25)]',
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
