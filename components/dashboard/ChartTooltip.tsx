'use client';

import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; stroke?: string; fill?: string; name?: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

/**
 * Sales Intelligence Dashboard tooltip.
 * White surface, slate border, navy text.
 */
export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2">
      <div className="text-[11px] font-semibold mb-1 text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5 last:mb-0">
          <div
            className="w-2 h-2 rounded-sm"
            style={{ background: p.stroke || p.fill }}
          />
          {p.name && (
            <span className="text-[11px] text-slate-500">{p.name}:</span>
          )}
          <span className="text-[13px] font-semibold tabular-nums text-[#020617]">
            {formatter ? formatter(p.value) : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
