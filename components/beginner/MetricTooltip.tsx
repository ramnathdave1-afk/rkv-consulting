'use client';

import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MetricTooltipProps {
  metric: string;
  value: number | string;
  benchmark?: {
    min: number;
    max: number;
    label: string;
  };
  explanation: string;
  children?: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/* ------------------------------------------------------------------ */
/*  Benchmark status                                                   */
/* ------------------------------------------------------------------ */

type BenchmarkStatus = 'good' | 'warning' | 'danger';

function getBenchmarkStatus(
  value: number | string,
  benchmark?: { min: number; max: number },
): BenchmarkStatus {
  if (!benchmark) return 'good';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'good';

  if (numValue >= benchmark.min && numValue <= benchmark.max) return 'good';

  // Check if within 20% of range edges
  const range = benchmark.max - benchmark.min;
  const margin = range * 0.2;
  if (
    numValue >= benchmark.min - margin &&
    numValue <= benchmark.max + margin
  ) {
    return 'warning';
  }

  return 'danger';
}

const statusColors: Record<BenchmarkStatus, { bg: string; text: string; dot: string; label: string }> = {
  good: {
    bg: 'rgba(201, 168, 76, 0.1)',
    text: '#c9a84c',
    dot: '#c9a84c',
    label: 'Healthy',
  },
  warning: {
    bg: 'rgba(217, 119, 6, 0.1)',
    text: '#D97706',
    dot: '#D97706',
    label: 'Monitor',
  },
  danger: {
    bg: 'rgba(220, 38, 38, 0.1)',
    text: '#DC2626',
    dot: '#DC2626',
    label: 'Attention',
  },
};

/* ------------------------------------------------------------------ */
/*  Popover positioning                                                */
/* ------------------------------------------------------------------ */

const sideOffsets: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function MetricTooltip({
  metric,
  value,
  benchmark,
  explanation,
  children,
  side = 'top',
}: MetricTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const status = getBenchmarkStatus(value, benchmark);
  const statusStyle = statusColors[status];

  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : value;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-1"
    >
      {/* Wrapped content */}
      {children}

      {/* Info icon trigger */}
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center justify-center',
          'w-4 h-4 rounded-full',
          'text-muted hover:text-gold transition-colors duration-150',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/30',
        )}
        aria-label={`Info about ${metric}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {/* Popover */}
      {open && (
        <div
          className={cn(
            'absolute z-[100] w-64 rounded-lg p-3.5',
            'animate-fade-up',
            sideOffsets[side],
          )}
          style={{
            background: '#111111',
            border: '1px solid #1e1e1e',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 40px rgba(201, 168, 76, 0.03)',
          }}
        >
          {/* Metric name */}
          <p className="font-display text-xs font-bold text-white mb-1.5">
            {metric}
          </p>

          {/* Explanation */}
          <p className="text-[11px] text-muted leading-relaxed mb-3">
            {explanation}
          </p>

          {/* Your value */}
          <div
            className="rounded-lg px-3 py-2 mb-2"
            style={{ background: '#080808', border: '1px solid #1A2332' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                Yours
              </span>
              <span className="font-mono text-sm font-semibold text-white">
                {formattedValue}
              </span>
            </div>
          </div>

          {/* Benchmark range */}
          {benchmark && (
            <div
              className="rounded-lg px-3 py-2"
              style={{ background: '#080808', border: '1px solid #1A2332' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                  {benchmark.label || 'Healthy Range'}
                </span>
                <span className="font-mono text-xs text-muted">
                  {benchmark.min} &ndash; {benchmark.max}
                </span>
              </div>
              {/* Status indicator */}
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: statusStyle.dot }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: statusStyle.text }}
                >
                  {statusStyle.label}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { MetricTooltip };
