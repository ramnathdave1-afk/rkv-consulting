'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartTooltip } from '@/components/dashboard/ChartTooltip';

interface ExpenseBreakdownProps {
  data: { category: string; amount: number }[];
}

const COLORS = ['#0369A1', '#0F172A', '#059669', '#d97706', '#7c3aed', '#0284C7', '#dc2626', '#64748b'];

export function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
  if (data.length === 0) return null;

  const formatted = data.map((d) => ({
    name: d.category.replace('_', ' '),
    value: d.amount,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#020617]">Expense Breakdown</h3>
        <span className="text-xs text-slate-500">MTD</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formatted}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="#fff"
              strokeWidth={2}
            >
              {formatted.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#64748b' }}
              iconType="square"
              formatter={(value) => <span className="capitalize text-slate-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
