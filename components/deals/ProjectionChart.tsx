'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectionYearData {
  year: number;
  equity: number;
  cashFlow: number;
  totalWealth: number;
}

export interface ProjectionChartProps {
  data: ProjectionYearData[];
  years?: 5 | 10 | 20 | 30;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDollar(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-deep border border-border rounded-lg px-4 py-3 shadow-card">
      <p className="font-display font-semibold text-xs text-white mb-2">Year {label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted font-body">{entry.name}:</span>
            <span className="text-xs text-white font-body font-medium tabular-nums ml-auto">
              {formatDollar(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Year period buttons                                                */
/* ------------------------------------------------------------------ */

const PERIODS: Array<{ label: string; value: 5 | 10 | 20 | 30 }> = [
  { label: '5yr', value: 5 },
  { label: '10yr', value: 10 },
  { label: '20yr', value: 20 },
  { label: '30yr', value: 30 },
];

/* ------------------------------------------------------------------ */
/*  ProjectionChart                                                    */
/* ------------------------------------------------------------------ */

function ProjectionChart({ data, years: initialYears = 30 }: ProjectionChartProps) {
  const [selectedYears, setSelectedYears] = useState<5 | 10 | 20 | 30>(initialYears);

  const filteredData = useMemo(
    () => data.filter((d) => d.year <= selectedYears),
    [data, selectedYears],
  );

  return (
    <div className="w-full">
      {/* Period buttons */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-muted font-body mr-2">Time Period:</span>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setSelectedYears(p.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-body font-medium',
              'transition-all duration-200 ease-out',
              selectedYears === p.value
                ? 'bg-gold text-black'
                : 'bg-deep border border-border text-muted hover:text-white hover:border-gold/30',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="w-full h-[360px] bg-deep rounded-xl border border-border p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#161E2A"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: '#4A6080', fontSize: 11, fontFamily: 'Inter' }}
              axisLine={{ stroke: '#161E2A' }}
              tickLine={false}
              label={{
                value: 'Year',
                position: 'insideBottomRight',
                offset: -5,
                fill: '#4A6080',
                fontSize: 11,
                fontFamily: 'Inter',
              }}
            />
            <YAxis
              tickFormatter={formatDollar}
              tick={{ fill: '#4A6080', fontSize: 11, fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '12px',
                fontFamily: 'Inter',
                fontSize: '12px',
              }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="equity"
              name="Equity"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#059669', stroke: '#080B0F', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="cashFlow"
              name="Cash Flow"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#059669', stroke: '#080B0F', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="totalWealth"
              name="Total Wealth"
              stroke="#E2E8F0"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: '#E2E8F0', stroke: '#080B0F', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

ProjectionChart.displayName = 'ProjectionChart';

export { ProjectionChart };
export default ProjectionChart;
