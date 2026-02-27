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
/*  Scanning line animation (CSS-in-JS)                                */
/* ------------------------------------------------------------------ */

const scannerKeyframes = `
@keyframes skeleton-scan {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

const scannerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
};

const scanLineStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'linear-gradient(90deg, transparent 0%, rgba(5, 150, 105, 0.08) 40%, rgba(5, 150, 105, 0.15) 50%, rgba(5, 150, 105, 0.08) 60%, transparent 100%)',
  animation: 'skeleton-scan 2s ease-in-out infinite',
};

/* ------------------------------------------------------------------ */
/*  Base style                                                         */
/* ------------------------------------------------------------------ */

const skeletonBase = 'relative overflow-hidden rounded';
const skeletonBg: React.CSSProperties = {
  backgroundColor: 'rgba(13, 32, 64, 0.3)',
};

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
    className: 'rounded-lg',
  },
  circle: {
    width: '40px',
    height: '40px',
    className: 'rounded-full',
  },
  chart: {
    width: '100%',
    height: '200px',
    className: 'rounded-lg',
  },
};

/* ------------------------------------------------------------------ */
/*  Scanner overlay component                                          */
/* ------------------------------------------------------------------ */

function ScanLine() {
  return (
    <>
      <style>{scannerKeyframes}</style>
      <div style={scannerStyle}>
        <div style={scanLineStyle} />
      </div>
    </>
  );
}

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
    ...skeletonBg,
    width: width ?? defaults.width,
    height: height ?? defaults.height,
  };

  if (variant === 'chart') {
    return (
      <div
        className={cn(skeletonBase, defaults.className, className)}
        style={style}
      >
        {/* Simulated chart bars */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-4 pb-4 gap-2 h-full">
          {[65, 40, 80, 55, 70, 45, 90, 60].map((h, i) => (
            <div
              key={i}
              className="rounded-t flex-1"
              style={{ height: `${h}%`, backgroundColor: 'rgba(13, 32, 64, 0.5)' }}
            />
          ))}
        </div>
        <ScanLine />
      </div>
    );
  }

  return (
    <div
      className={cn(skeletonBase, defaults.className, className)}
      style={style}
    >
      <ScanLine />
    </div>
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
