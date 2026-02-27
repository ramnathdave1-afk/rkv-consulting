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
    <div className={cn('animate-pulse rounded bg-border/30', className)} />
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
  const sparklineColor = trend === 'down' ? '#DC2626' : '#059669';

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-lg p-5" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
        <Skeleton className="h-3 w-20 mb-4" />
        <Skeleton className="h-8 w-28 mb-3" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg p-5 group',
        'transition-all duration-300 ease-out cursor-default',
      )}
      style={{ background: '#0C1018', border: '1px solid #161E2A' }}
    >
      {/* Subtle background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" />

      {/* Top row: label + sparkline */}
      <div className="relative flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-gold opacity-60" strokeWidth={1.5} />
          <span className="label text-gold">{title}</span>
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <SparklineChart
            data={sparklineData}
            width={72}
            height={32}
            color={sparklineColor}
          />
        )}
      </div>

      {/* Large value */}
      <div className="relative">
        <span className="font-mono text-[28px] font-semibold text-white leading-none tracking-tight inline-block">
          {prefix}{formatValue(value)}{suffix}
        </span>
      </div>

      {/* Bottom: change indicator */}
      <div className="relative mt-3 flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 font-mono text-[11px] font-medium',
            isPositive ? 'text-green' : 'text-red',
          )}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={cn(!isPositive && 'rotate-180')}>
            <path d="M5 1.5L8.5 6H1.5L5 1.5Z" fill="currentColor" />
          </svg>
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
        <span className="font-mono text-[10px] text-muted-deep">{changeLabel}</span>
      </div>

      {/* Thin progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/30">
        <div
          className="h-full bg-gold/30 transition-all duration-1000"
          style={{ width: `${Math.min(100, Math.abs(change) * 5)}%` }}
        />
      </div>
    </div>
  );
}
