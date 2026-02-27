'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
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
            {formatCurrency(Math.abs(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CashFlowChartProps {
  data: AnalyzerAnnualProjection[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = data.map((d) => ({
    year: `Yr ${d.year}`,
    income: Math.round(d.effectiveRent),
    expenses: Math.round(-d.totalExpenses),
    debtService: Math.round(-d.debtService),
    cashFlow: Math.round(d.cashFlow),
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
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
              v === 0 ? '$0' : `${v < 0 ? '-' : ''}$${Math.abs(v / 1000).toFixed(0)}k`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(5,150,105,0.05)' }} />
          <Legend
            iconType="square"
            iconSize={10}
            wrapperStyle={{
              fontSize: 11,
              fontFamily: 'DM Sans, sans-serif',
              color: '#4A6080',
              paddingTop: 8,
            }}
          />
          <ReferenceLine y={0} stroke={MUTED} strokeDasharray="2 2" />

          {/* Gold bars for income */}
          <Bar
            dataKey="income"
            name="Income"
            fill={GOLD}
            radius={[4, 4, 0, 0]}
            animationDuration={900}
          />

          {/* Muted gray bars for operating expenses */}
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill={MUTED}
            radius={[4, 4, 0, 0]}
            animationDuration={900}
          />

          {/* Red bars for debt service */}
          <Bar
            dataKey="debtService"
            name="Debt Service"
            fill={RED}
            opacity={0.7}
            radius={[4, 4, 0, 0]}
            animationDuration={900}
          />

          {/* Green/red bars for net cash flow — conditionally colored per bar */}
          <Bar
            dataKey="cashFlow"
            name="Net Cash Flow"
            fill={GREEN}
            radius={[4, 4, 0, 0]}
            animationDuration={900}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.cashFlow >= 0 ? GREEN : RED}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
