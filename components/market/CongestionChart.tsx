'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CongestionChartProps {
  data: Array<{ region: string; capacity_mw: number; available_mw: number }>;
}

const ZONE_COLORS = ['#00D4AA', '#3B82F6', '#8A00FF', '#F59E0B', '#EF4444', '#22C55E', '#EC4899', '#06B6D4'];

export function CongestionChart({ data }: CongestionChartProps) {
  // Group by state and generate 12-month mock trend data
  const states = [...new Set(data.map((d) => d.region))];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = months.map((month, i) => {
    const point: Record<string, string | number> = { month };
    states.forEach((state) => {
      const stateData = data.filter((d) => d.region === state);
      const totalCap = stateData.reduce((s, d) => s + d.capacity_mw, 0);
      const totalAvail = stateData.reduce((s, d) => s + d.available_mw, 0);
      const baseUtil = totalCap > 0 ? ((totalCap - totalAvail) / totalCap) * 100 : 0;
      // Add seasonal variation
      const seasonal = Math.sin((i / 12) * Math.PI * 2) * 8 + (Math.random() - 0.5) * 4;
      point[state] = Math.max(0, Math.min(100, Math.round(baseUtil + seasonal)));
    });
    return point;
  });

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Substation Congestion Trends</h3>
          <p className="text-[10px] text-text-muted mt-0.5">% utilization by ISO zone — 12 month view</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="month" tick={{ fill: '#4A5568', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
          <YAxis tick={{ fill: '#4A5568', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{ backgroundColor: '#0C1017', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#8B95A5', fontSize: 10 }}
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
          {states.slice(0, 8).map((state, i) => (
            <Line
              key={state}
              type="monotone"
              dataKey={state}
              stroke={ZONE_COLORS[i % ZONE_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
