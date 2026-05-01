'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTooltip } from '@/components/dashboard/ChartTooltip';

interface RevenueChartProps {
  data: { month: string; income: number; expenses: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.month.slice(5), // "01", "02", etc.
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#020617]">Income vs Expenses</h3>
        <span className="text-xs text-slate-500">12 months</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0369A1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0369A1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F172A" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#0F172A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} iconType="square" />
            <Area type="monotone" dataKey="income" name="Income" stroke="#0369A1" fill="url(#incomeGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#0F172A" fill="url(#expenseGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
