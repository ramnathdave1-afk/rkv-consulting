'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ExpenseBreakdownProps {
  data: { category: string; amount: number }[];
}

const COLORS = ['#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#22C55E', '#EC4899', '#06B6D4', '#6B7280'];

export function ExpenseBreakdown({ data }: ExpenseBreakdownProps) {
  if (data.length === 0) return null;

  const formatted = data.map((d) => ({
    name: d.category.replace('_', ' '),
    value: d.amount,
  }));

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Expense Breakdown (MTD)</h3>
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
            >
              {formatted.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1D23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} formatter={(value) => <span className="capitalize">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
