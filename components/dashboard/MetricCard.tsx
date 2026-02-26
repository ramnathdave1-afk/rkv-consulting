'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import SparklineChart from './SparklineChart';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: LucideIcon;
  trend: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

function formatValue(value: string | number): string {
  if (typeof value === 'string') return value;
  return value.toLocaleString('en-US');
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-border/50',
        className,
      )}
    />
  );
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend,
  sparklineData,
  prefix = '',
  suffix = '',
  loading = false,
}: MetricCardProps) {
  const isPositive = change >= 0;
  const sparklineColor = trend === 'down' ? '#EF4444' : '#C9A84C';

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="mt-3">
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl p-6',
        'transition-all duration-200 ease-out',
        'hover:scale-[1.02] hover:shadow-glow hover:border-gold/30',
        'group cursor-default',
      )}
    >
      {/* Top row: icon + title ... sparkline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border/50">
            <Icon className="h-5 w-5 text-muted" />
          </div>
          <span className="text-sm font-medium text-muted">{title}</span>
        </div>

        {sparklineData && sparklineData.length >= 2 && (
          <SparklineChart
            data={sparklineData}
            width={80}
            height={40}
            color={sparklineColor}
            showArea
          />
        )}
      </div>

      {/* Middle: large value */}
      <div className="mt-4">
        <span className="text-3xl font-bold tracking-tight text-white">
          {prefix}
          {formatValue(value)}
          {suffix}
        </span>
      </div>

      {/* Bottom: change badge + label */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
            isPositive
              ? 'bg-green/10 text-green'
              : 'bg-red/10 text-red',
          )}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={cn(!isPositive && 'rotate-180')}
          >
            <path
              d="M6 2.5L9.5 6.5H2.5L6 2.5Z"
              fill="currentColor"
            />
          </svg>
          {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-xs text-muted">{changeLabel}</span>
      </div>
    </div>
  );
}
