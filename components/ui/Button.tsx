'use client';

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'solid' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg-primary hover:bg-accent-hover active:scale-[0.97]',
  solid: 'bg-accent text-bg-primary hover:bg-accent-hover active:scale-[0.97]',
  outline: 'bg-transparent border border-accent text-accent hover:bg-accent-muted active:scale-[0.97]',
  ghost: 'bg-transparent border border-border text-text-secondary hover:border-border-hover hover:text-text-primary active:scale-[0.97]',
  danger: 'bg-danger-muted border border-[rgba(239,68,68,0.25)] text-danger hover:bg-[rgba(239,68,68,0.15)] active:scale-[0.97]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-sm gap-2 rounded-lg',
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, fullWidth = false, icon, disabled, className, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-150 ease-out select-none whitespace-nowrap',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-muted',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 pointer-events-none cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {loading ? <Spinner className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : icon ? <span className="shrink-0 flex items-center">{icon}</span> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { Button };
export default Button;
