'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MarketRow {
  region: string;
  state: string;
  avg_power_cost_kwh: number;
}

interface UtilityRatesChartProps {
  data: MarketRow[];
}

export function UtilityRatesChart({ data }: UtilityRatesChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.avg_power_cost_kwh - a.avg_power_cost_kwh)
    .map((d) => ({
      region: d.region,
      cost: Number((d.avg_power_cost_kwh * 100).toFixed(2)),
    }));

  const maxCost = Math.max(...sorted.map((d) => d.cost));

  function getBarColor(cost: number) {
    const ratio = cost / maxCost;
    if (ratio > 0.75) return '#EF4444';
    if (ratio > 0.5) return '#F59E0B';
    if (ratio > 0.25) return '#3B82F6';
    return '#00D4AA';
  }

  return (
    <div className="glass-card p-3">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">County-Level Utility Rates</h3>
        <p className="text-[10px] text-text-muted mt-0.5">Average power cost (¢/kWh) by region</p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(280, sorted.length * 28)}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#4A5568', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} unit="¢" />
          <YAxis dataKey="region" type="category" tick={{ fill: '#8B95A5', fontSize: 10 }} width={120} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0C1017', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
            formatter={(value) => [`${value}¢/kWh`, 'Cost']}
          />
          <Bar dataKey="cost" radius={[0, 3, 3, 0]} barSize={16}>
            {sorted.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.cost)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
