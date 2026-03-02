'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ScenarioData {
  monthlyCashFlow: number;
  annualROI: number;
  fiveYearEquity: number;
  totalReturn: number;
}

export interface ScenarioCardsProps {
  scenarios: {
    conservative: ScenarioData;
    base: ScenarioData;
    aggressive: ScenarioData;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt$(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}K`;
  return `${value < 0 ? '-' : ''}$${abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/*  Single scenario card                                               */
/* ------------------------------------------------------------------ */

interface SingleCardProps {
  label: string;
  icon: React.ReactNode;
  borderColor: string;
  badge?: string;
  badgeColor?: string;
  data: ScenarioData;
}

function SingleCard({ label, icon, borderColor, badge, badgeColor, data }: SingleCardProps) {
  const rows = [
    { label: 'Monthly Cash Flow', value: fmt$(data.monthlyCashFlow), positive: data.monthlyCashFlow >= 0 },
    { label: 'Annual ROI', value: fmtPct(data.annualROI), positive: data.annualROI >= 0 },
    { label: '5-Year Equity', value: fmt$(data.fiveYearEquity), positive: data.fiveYearEquity >= 0 },
    { label: 'Total Return', value: fmt$(data.totalReturn), positive: data.totalReturn >= 0 },
  ];

  return (
    <div
      className={cn(
        'relative bg-card rounded-xl border overflow-hidden',
        'transition-all duration-300 hover:shadow-card',
      )}
      style={{ borderColor }}
    >
      {/* Badge */}
      {badge && (
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-body font-medium"
          style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}
        >
          {badge}
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-2.5">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: `${borderColor}15` }}
        >
          <span style={{ color: borderColor }}>{icon}</span>
        </div>
        <h4 className="font-display font-semibold text-sm text-white">{label}</h4>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-border" />

      {/* Metrics */}
      <div className="px-5 py-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted font-body">{row.label}</span>
            <span
              className={cn(
                'text-sm font-body font-medium tabular-nums',
                row.positive ? 'text-green' : 'text-red',
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ScenarioCards                                                      */
/* ------------------------------------------------------------------ */

function ScenarioCards({ scenarios }: ScenarioCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SingleCard
        label="Conservative"
        icon={<TrendingDown className="w-4 h-4" />}
        borderColor="#4A6080"
        data={scenarios.conservative}
      />
      <SingleCard
        label="Base Case"
        icon={<Target className="w-4 h-4" />}
        borderColor="#c9a84c"
        badge="Most Likely"
        badgeColor="#c9a84c"
        data={scenarios.base}
      />
      <SingleCard
        label="Aggressive"
        icon={<TrendingUp className="w-4 h-4" />}
        borderColor="#c9a84c"
        data={scenarios.aggressive}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

ScenarioCards.displayName = 'ScenarioCards';

export { ScenarioCards };
export default ScenarioCards;
