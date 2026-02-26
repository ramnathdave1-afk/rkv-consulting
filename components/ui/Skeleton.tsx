'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SkeletonVariant = 'text' | 'card' | 'circle' | 'chart';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export interface SkeletonGroupProps {
  count: number;
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  gap?: string;
  className?: string;
  itemClassName?: string;
}

/* ------------------------------------------------------------------ */
/*  Base pulse style                                                   */
/* ------------------------------------------------------------------ */

const pulseBase = 'animate-pulse bg-border/50 rounded';

/* ------------------------------------------------------------------ */
/*  Variant defaults                                                   */
/* ------------------------------------------------------------------ */

const variantDefaults: Record<
  SkeletonVariant,
  { width: string; height: string; className: string }
> = {
  text: {
    width: '100%',
    height: '14px',
    className: 'rounded',
  },
  card: {
    width: '100%',
    height: '160px',
    className: 'rounded-xl',
  },
  circle: {
    width: '40px',
    height: '40px',
    className: 'rounded-full',
  },
  chart: {
    width: '100%',
    height: '200px',
    className: 'rounded-xl',
  },
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton({
  variant = 'text',
  width,
  height,
  className,
}: SkeletonProps) {
  const defaults = variantDefaults[variant];

  const style: React.CSSProperties = {
    width: width ?? defaults.width,
    height: height ?? defaults.height,
  };

  if (variant === 'chart') {
    return (
      <div
        className={cn(pulseBase, 'relative overflow-hidden', defaults.className, className)}
        style={style}
      >
        {/* Simulated chart bars */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-4 pb-4 gap-2 h-full">
          {[65, 40, 80, 55, 70, 45, 90, 60].map((h, i) => (
            <div
              key={i}
              className="bg-border/70 rounded-t flex-1"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(pulseBase, defaults.className, className)}
      style={style}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  SkeletonGroup                                                      */
/* ------------------------------------------------------------------ */

function SkeletonGroup({
  count,
  variant = 'text',
  width,
  height,
  gap = '0.75rem',
  className,
  itemClassName,
}: SkeletonGroupProps) {
  return (
    <div className={cn('flex flex-col', className)} style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          width={width}
          height={height}
          className={itemClassName}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Display names                                                      */
/* ------------------------------------------------------------------ */

Skeleton.displayName = 'Skeleton';
SkeletonGroup.displayName = 'SkeletonGroup';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Skeleton, SkeletonGroup };
export default Skeleton;
