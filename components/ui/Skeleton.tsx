'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-bg-elevated', className)}
      style={{ width, height }}
    />
  );
}

function SkeletonGroup({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

Skeleton.displayName = 'Skeleton';
SkeletonGroup.displayName = 'SkeletonGroup';
export { Skeleton, SkeletonGroup };
export default Skeleton;
