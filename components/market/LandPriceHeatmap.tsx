'use client';

import React from 'react';

interface MarketRow {
  region: string;
  state: string;
  avg_land_cost_acre: number;
  avg_power_cost_kwh: number;
  tax_incentive_score: number;
  fiber_density_score: number;
}

interface LandPriceHeatmapProps {
  data: MarketRow[];
}

const metrics = [
  { key: 'avg_land_cost_acre', label: 'Land $/acre', format: (v: number) => `$${(v / 1000).toFixed(0)}k`, invert: true },
  { key: 'avg_power_cost_kwh', label: 'Power $/kWh', format: (v: number) => `${(v * 100).toFixed(1)}¢`, invert: true },
  { key: 'tax_incentive_score', label: 'Tax Incentive', format: (v: number) => v.toFixed(0), invert: false },
  { key: 'fiber_density_score', label: 'Fiber Density', format: (v: number) => v.toFixed(0), invert: false },
] as const;

function getHeatColor(value: number, min: number, max: number, invert: boolean): string {
  if (max === min) return 'rgba(0, 212, 170, 0.3)';
  let ratio = (value - min) / (max - min);
  if (invert) ratio = 1 - ratio;

  if (ratio > 0.75) return 'rgba(0, 212, 170, 0.5)';
  if (ratio > 0.5) return 'rgba(0, 212, 170, 0.3)';
  if (ratio > 0.25) return 'rgba(245, 158, 11, 0.3)';
  return 'rgba(239, 68, 68, 0.25)';
}

export function LandPriceHeatmap({ data }: LandPriceHeatmapProps) {
  const ranges: Record<string, { min: number; max: number }> = {};
  metrics.forEach((m) => {
    const values = data.map((d) => d[m.key] as number);
    ranges[m.key] = { min: Math.min(...values), max: Math.max(...values) };
  });

  return (
    <div className="glass-card p-3">
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Regional Market Heatmap</h3>
        <p className="text-[10px] text-text-muted mt-0.5">Land cost, power cost, incentives, and fiber by region</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5 px-2 text-[10px] uppercase tracking-wider text-text-muted font-medium w-32">Region</th>
              {metrics.map((m) => (
                <th key={m.key} className="text-center py-1.5 px-2 text-[10px] uppercase tracking-wider text-text-muted font-medium">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.region} className="border-b border-border/30 hover:bg-bg-elevated/20 transition-colors">
                <td className="py-1.5 px-2 font-medium text-text-secondary">{row.region}</td>
                {metrics.map((m) => {
                  const val = row[m.key] as number;
                  const r = ranges[m.key];
                  return (
                    <td key={m.key} className="py-1.5 px-2 text-center">
                      <span
                        className="inline-block px-2 py-0.5 rounded font-mono text-[10px] text-text-primary"
                        style={{ backgroundColor: getHeatColor(val, r.min, r.max, m.invert) }}
                      >
                        {m.format(val)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-3 justify-end">
        <span className="text-[9px] text-text-muted">Favorability:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.25)' }} />
          <span className="text-[9px] text-text-muted">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.3)' }} />
          <span className="text-[9px] text-text-muted">Mid</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(0, 212, 170, 0.5)' }} />
          <span className="text-[9px] text-text-muted">High</span>
        </div>
      </div>
    </div>
  );
}
