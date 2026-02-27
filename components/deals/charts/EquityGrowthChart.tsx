'use client';

import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import type { AnalyzerAnnualProjection } from '@/types';
import { formatCurrency } from '@/lib/calculations/property-analyzer';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const GOLD = '#059669';
const CARD_BG = '#0C1018';
const BORDER = '#161E2A';
const GREEN = '#059669';
const RED = '#DC2626';
const MUTED = '#4A6080';
const GRID = '#161E2A';

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#E2E8F0', fontWeight: 600, marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 2,
          }}
        >
          <span style={{ color: entry.color, fontSize: 11 }}>{entry.name}</span>
          <span style={{ color: '#E2E8F0', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface EquityGrowthChartProps {
  data: AnalyzerAnnualProjection[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EquityGrowthChart({ data }: EquityGrowthChartProps) {
  const chartData = data.map((d) => ({
    year: `Yr ${d.year}`,
    equity: Math.round(d.equity),
    propertyValue: Math.round(d.propertyValue),
    loanBalance: Math.round(d.loanBalance),
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="rkv-equity-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="year"
            stroke={MUTED}
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            tickLine={false}
            axisLine={{ stroke: BORDER }}
          />
          <YAxis
            stroke={MUTED}
            fontSize={10}
            fontFamily="'JetBrains Mono', monospace"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: GOLD, strokeOpacity: 0.2 }} />
          <Legend
            iconType="line"
            iconSize={12}
            wrapperStyle={{
              fontSize: 11,
              fontFamily: 'DM Sans, sans-serif',
              color: '#4A6080',
              paddingTop: 8,
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            name="Total Equity"
            stroke={GOLD}
            strokeWidth={2.5}
            fill="url(#rkv-equity-grad)"
            animationDuration={1200}
          />
          <Line
            type="monotone"
            dataKey="propertyValue"
            name="Property Value"
            stroke={GREEN}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            animationDuration={1200}
          />
          <Line
            type="monotone"
            dataKey="loanBalance"
            name="Loan Balance"
            stroke={RED}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            animationDuration={1200}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
