'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatFullCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 shadow-card" style={{ background: '#111111', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
      <p className="font-mono text-[10px] text-muted">{label}</p>
      <p className="font-mono text-sm font-semibold text-gold">{formatFullCurrency(payload[0].value)}</p>
    </div>
  );
}

interface PortfolioChartProps {
  data: Array<{ month: string; cashFlow: number }>;
}

export default function PortfolioChart({ data }: PortfolioChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(30, 37, 48, 0.6)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          stroke="#4A6080"
          tick={{ fill: '#4A6080', fontSize: 12 }}
          axisLine={{ stroke: '#1e1e1e' }}
          tickLine={false}
        />
        <YAxis
          stroke="#4A6080"
          tick={{ fill: '#4A6080', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(val: number) => formatCurrency(val)}
          width={70}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="cashFlow"
          stroke="#c9a84c"
          strokeWidth={2.5}
          dot={false}
          activeDot={{
            r: 5,
            fill: '#c9a84c',
            stroke: '#111111',
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
