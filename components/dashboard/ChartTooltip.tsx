'use client';

import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; stroke?: string; fill?: string; name?: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

/**
 * Premium custom tooltip for Recharts with glass effect.
 */
export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div
      className="rounded-xl border backdrop-blur-xl"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
        padding: '12px 16px',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div
        className="text-[11px] font-semibold mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <div
            className="w-2 h-2 rounded-sm"
            style={{ background: p.stroke || p.fill }}
          />
          <span
            className="text-[13px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatter ? formatter(p.value) : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
