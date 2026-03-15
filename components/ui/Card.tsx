'use client';

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', header, footer, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl overflow-hidden',
          variant === 'glass' ? 'glass-card' : variant === 'elevated' ? 'bg-bg-elevated border border-border' : 'bg-bg-secondary border border-border',
          !header && !footer && paddingStyles[padding],
          className,
        )}
        {...props}
      >
        {header && (
          <div className={cn('border-b border-border', paddingStyles[padding === 'none' ? 'md' : padding])}>
            {header}
          </div>
        )}
        {header || footer ? <div className={paddingStyles[padding]}>{children}</div> : children}
        {footer && (
          <div className={cn('border-t border-border', paddingStyles[padding === 'none' ? 'md' : padding])}>
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
