'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { formatCurrency } from '@/lib/calculations/property-analyzer';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const GOLD = '#C9A84C';
const CARD_BG = '#111620';
const BORDER = '#1E2530';
const GREEN = '#22C55E';
const CYAN = '#06B6D4';
const MUTED = '#6B7280';
const GRID = '#1E2530';
const WHITE = '#F0EDE8';

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { name: string; value: number; color: string };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
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
      <p style={{ color: entry.payload.color, fontWeight: 600, marginBottom: 4, fontFamily: 'Syne, sans-serif' }}>
        {entry.payload.name}
      </p>
      <p style={{ color: WHITE, fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(entry.payload.value)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface EquityWaterfallProps {
  downPayment: number;
  principalPaid: number;
  appreciation: number;
  totalEquity: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EquityWaterfall({
  downPayment,
  principalPaid,
  appreciation,
  totalEquity,
}: EquityWaterfallProps) {
  const data = [
    { name: 'Down Payment', value: Math.round(downPayment), color: GOLD },
    { name: 'Principal Paid', value: Math.round(principalPaid), color: GREEN },
    { name: 'Appreciation', value: Math.round(appreciation), color: CYAN },
    { name: 'Total Equity', value: Math.round(totalEquity), color: '#E8C97A' },
  ];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="name"
            stroke={MUTED}
            fontSize={11}
            fontFamily="DM Sans"
            tickLine={false}
            axisLine={{ stroke: BORDER }}
            tick={{ fill: '#9CA3AF' }}
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            animationDuration={1000}
            animationBegin={100}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: any) => {
                const n = Number(v) || 0;
                if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
                if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
                return `$${n}`;
              }) as any}
              style={{
                fill: WHITE,
                fontSize: 11,
                fontFamily: 'DM Sans',
                fontWeight: 500,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
