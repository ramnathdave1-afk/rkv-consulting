'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import type { AnalyzerMonthlyCashFlow } from '@/types';
import { formatCurrency } from '@/lib/calculations/property-analyzer';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const GOLD = '#059669';
const CARD_BG = '#0C1018';
const BORDER = '#161E2A';
const GREEN = '#059669';
const RED = '#DC2626';

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  value: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div
      style={{
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: '4px 10px',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11,
      }}
    >
      <span style={{ color: '#4A6080', marginRight: 6 }}>Mo {label}</span>
      <span
        style={{
          color: val >= 0 ? GREEN : RED,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatCurrency(val)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CashFlowSparklineProps {
  data: AnalyzerMonthlyCashFlow[];
  height?: number;
  /** Number of months to display (default 24) */
  months?: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CashFlowSparkline({
  data,
  height = 60,
  months = 24,
}: CashFlowSparklineProps) {
  const chartData = data.slice(0, months).map((d) => ({
    month: d.month,
    cashFlow: Math.round(d.cashFlow),
  }));

  // Determine overall trend color based on average cash flow
  const avg =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.cashFlow, 0) / chartData.length
      : 0;
  const trendColor = avg >= 0 ? GOLD : RED;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <defs>
          <linearGradient id="rkv-spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="cashFlow"
          stroke={trendColor}
          strokeWidth={1.5}
          fill="url(#rkv-spark-grad)"
          animationDuration={800}
          dot={false}
          activeDot={{
            r: 3,
            fill: trendColor,
            stroke: CARD_BG,
            strokeWidth: 1.5,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
