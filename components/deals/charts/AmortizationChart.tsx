'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { AnalyzerAmortizationRow } from '@/types';
import { formatCurrency } from '@/lib/calculations/property-analyzer';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const GOLD = '#C9A84C';
const CARD_BG = '#111620';
const BORDER = '#1E2530';
const MUTED = '#6B7280';
const GRID = '#1E2530';
const MUTED_FILL = '#4B5563';

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
  label?: string | number;
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
      <p style={{ color: '#F0EDE8', fontWeight: 600, marginBottom: 6, fontFamily: 'Syne, sans-serif' }}>
        Year {label}
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
          <span style={{ color: '#F0EDE8', fontVariantNumeric: 'tabular-nums' }}>
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

interface AmortizationChartProps {
  data: AnalyzerAmortizationRow[];
  compact?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AmortizationChart({ data, compact = false }: AmortizationChartProps) {
  // Sample every 12 months (year-end) for the chart
  const chartData = data
    .filter((_, i) => i % 12 === 11 || i === 0)
    .map((d) => ({
      year: Math.ceil(d.month / 12),
      principal: Math.round(d.totalPrincipalPaid),
      interest: Math.round(d.totalInterestPaid),
      balance: Math.round(d.balance),
    }));

  const chartHeight = compact ? 220 : 320;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="rkv-principal-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="rkv-interest-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MUTED_FILL} stopOpacity={0.3} />
              <stop offset="100%" stopColor={MUTED_FILL} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="year"
            stroke={MUTED}
            fontSize={10}
            fontFamily="DM Sans"
            tickLine={false}
            axisLine={{ stroke: BORDER }}
            label={
              compact
                ? undefined
                : {
                    value: 'Year',
                    position: 'bottom' as const,
                    offset: -2,
                    style: { fill: MUTED, fontSize: 10, fontFamily: 'DM Sans' },
                  }
            }
          />
          <YAxis
            stroke={MUTED}
            fontSize={10}
            fontFamily="DM Sans"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v === 0 ? '$0' : `$${(v / 1000).toFixed(0)}k`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: GOLD, strokeOpacity: 0.15 }} />
          {!compact && (
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{
                fontSize: 11,
                fontFamily: 'DM Sans, sans-serif',
                color: '#9CA3AF',
                paddingTop: 8,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="principal"
            name="Cumulative Principal"
            stroke={GOLD}
            strokeWidth={2}
            fill="url(#rkv-principal-grad)"
            animationDuration={1200}
          />
          <Area
            type="monotone"
            dataKey="interest"
            name="Cumulative Interest"
            stroke={MUTED_FILL}
            strokeWidth={2}
            fill="url(#rkv-interest-grad)"
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
