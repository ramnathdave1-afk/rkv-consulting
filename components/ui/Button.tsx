'use client';

import React, { forwardRef, useState, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'solid' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  /** For danger variant: delays enabling the button by 1.5s (use in destructive modals) */
  delayEnable?: boolean;
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width="16"
      height="16"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'text-white',
    'hover:scale-[1.01]',
    'active:scale-[0.97]',
  ].join(' '),

  // Keep 'solid' as alias for primary (backward compat)
  solid: [
    'text-white',
    'hover:scale-[1.01]',
    'active:scale-[0.97]',
  ].join(' '),

  secondary: [
    'border border-[var(--border)] bg-transparent text-[var(--text-primary)]',
    'hover:bg-[var(--bg-surface)] hover:border-[var(--border-hover)]',
    'active:scale-[0.97]',
  ].join(' '),

  // Keep 'outline' as alias for secondary (backward compat)
  outline: [
    'border border-[var(--border)] bg-transparent text-[var(--text-primary)]',
    'hover:bg-[var(--bg-surface)] hover:border-[var(--border-hover)]',
    'active:scale-[0.97]',
  ].join(' '),

  ghost: [
    'bg-transparent text-[var(--accent)] ghost-underline',
    'hover:bg-[var(--accent-muted)]',
    'active:scale-[0.97]',
  ].join(' '),

  danger: [
    'bg-[var(--danger,#ef4444)] text-white',
    'hover:bg-[color-mix(in_srgb,var(--danger,#ef4444)_92%,black)]',
    'active:scale-[0.97]',
  ].join(' '),

  icon: [
    'bg-transparent text-[var(--text-secondary)]',
    'hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
    'active:scale-[0.95]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-[12px] gap-1.5 rounded-[var(--radius-sm,6px)] font-[var(--font-body)]',
  md: 'h-9 px-4 text-[14px] gap-2 rounded-[var(--radius-md,10px)] font-[var(--font-body)]',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-[var(--radius-md,10px)] font-[var(--font-body)]',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 rounded-[var(--radius-sm,6px)]',
  md: 'h-9 w-9 rounded-[var(--radius-md,10px)]',
  lg: 'h-11 w-11 rounded-[var(--radius-md,10px)]',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      disabled,
      delayEnable = false,
      className,
      children,
      title,
      style,
      ...props
    },
    ref,
  ) => {
    const [delayDisabled, setDelayDisabled] = useState(delayEnable);

    useEffect(() => {
      if (!delayEnable) {
        setDelayDisabled(false);
        return;
      }
      setDelayDisabled(true);
      const timer = setTimeout(() => setDelayDisabled(false), 1500);
      return () => clearTimeout(timer);
    }, [delayEnable]);

    const isIcon = variant === 'icon';
    const isDisabled = disabled || loading || delayDisabled;
    const isPrimary = variant === 'primary' || variant === 'solid';

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        title={title}
        className={cn(
          'inline-flex items-center justify-center font-semibold select-none whitespace-nowrap',
          'transition-all duration-[150ms] ease-out',
          'focus-visible:outline-none',
          variantStyles[variant],
          isIcon ? iconSizeStyles[size] : sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 pointer-events-none cursor-not-allowed',
          className,
        )}
        style={{
          willChange: 'transform',
          /* Primary/solid: subtle gradient from accent to slightly darker */
          ...(isPrimary
            ? {
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              }
            : {}),
          /* Focus ring via box-shadow for smoother appearance */
          ...style,
        }}
        onFocus={(e) => {
          if (!isDisabled) {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent)';
          }
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
          props.onBlur?.(e);
        }}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : icon ? (
          <span className="shrink-0 flex items-center">{icon}</span>
        ) : null}
        {!loading && !isIcon && children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { Button };
export default Button;
