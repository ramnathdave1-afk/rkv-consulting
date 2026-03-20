'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PropertyRevenueProps {
  data: { property_name: string; amount: number }[];
}

export function PropertyRevenue({ data }: PropertyRevenueProps) {
  if (data.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Revenue by Property (MTD)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="property_name" tick={{ fontSize: 10, fill: '#6B7280' }} width={120} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1D23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
            />
            <Bar dataKey="amount" fill="#00D4AA" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
