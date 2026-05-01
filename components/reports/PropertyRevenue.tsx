'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartTooltip } from '@/components/dashboard/ChartTooltip';

interface PropertyRevenueProps {
  data: { property_name: string; amount: number }[];
}

export function PropertyRevenue({ data }: PropertyRevenueProps) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#020617]">Revenue by Property</h3>
        <span className="text-xs text-slate-500">MTD</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="property_name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              content={<ChartTooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />}
            />
            <Bar dataKey="amount" name="Revenue" fill="#0369A1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
