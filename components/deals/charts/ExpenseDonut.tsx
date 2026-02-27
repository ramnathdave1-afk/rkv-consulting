'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/calculations/property-analyzer';

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */

const GOLD = '#059669';
const _GOLD_LIGHT = '#0EA5E9';
const CARD_BG = '#0C1018';
const BORDER = '#161E2A';
const GREEN = '#059669';
const MUTED = '#4A6080';
const VIOLET = '#0EA5E9';
const CYAN_LIGHT = '#0EA5E9';

// Futuristic palette — 6 distinct tones that read well on dark backgrounds
const EXPENSE_COLORS = [GOLD, '#DC2626', GREEN, VIOLET, CYAN_LIGHT, MUTED];

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                     */
/* ------------------------------------------------------------------ */

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { name: string; value: number; percent: number };
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
      <p style={{ color: '#E2E8F0', fontWeight: 600, marginBottom: 4, fontFamily: 'Syne, sans-serif' }}>
        {entry.name}
      </p>
      <p style={{ color: '#E2E8F0', fontVariantNumeric: 'tabular-nums' }}>
        {formatCurrency(entry.value)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ExpenseDonutProps {
  propertyTax: number;
  insurance: number;
  maintenance: number;
  hoa: number;
  management: number;
  vacancy?: number;
  mortgage?: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ExpenseDonut({
  propertyTax,
  insurance,
  maintenance,
  hoa,
  management,
  vacancy = 0,
  mortgage = 0,
}: ExpenseDonutProps) {
  // Build data array — all values should be annualized
  const rawData = [
    { name: 'Property Tax', value: Math.round(propertyTax) },
    { name: 'Insurance', value: Math.round(insurance) },
    { name: 'Maintenance', value: Math.round(maintenance) },
    { name: 'HOA', value: Math.round(hoa) },
    { name: 'Management', value: Math.round(management) },
    ...(vacancy > 0 ? [{ name: 'Vacancy', value: Math.round(vacancy) }] : []),
    ...(mortgage > 0 ? [{ name: 'Mortgage', value: Math.round(mortgage) }] : []),
  ].filter((d) => d.value > 0);

  const total = rawData.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="w-full flex items-center justify-center h-[280px]">
        <p style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>No expense data</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={rawData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            animationDuration={1000}
            animationBegin={150}
            stroke="none"
          >
            {rawData.map((_, index) => (
              <Cell
                key={index}
                fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {/* Center label showing total */}
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: '#E2E8F0',
              fontSize: 18,
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
            }}
          >
            {formatCurrency(total)}
          </text>
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fill: MUTED,
              fontSize: 10,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Total / Year
          </text>
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend below chart */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1 px-2">
        {rawData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}
            />
            <span style={{ color: '#4A6080' }} className="truncate">
              {d.name}
            </span>
            <span style={{ color: '#E2E8F0', fontVariantNumeric: 'tabular-nums' }} className="ml-auto">
              {total > 0 ? `${((d.value / total) * 100).toFixed(0)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
