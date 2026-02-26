'use client';

import {
  DollarSign,
  Home,
  TrendingUp,
  Users,
  Briefcase,
  Percent,
  Package,
  Clock,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Metrics {
  medianHomePrice: number;
  medianRent: number;
  rentYield: number;
  priceGrowth: number;
  populationGrowth: number;
  employmentRate: number;
  mortgageRate: number;
  inventory: number;
  daysOnMarket: number;
  priceToRent: number;
}

interface MarketMetricsProps {
  metrics: Metrics;
}

/* ------------------------------------------------------------------ */
/*  Metric config                                                      */
/* ------------------------------------------------------------------ */

type FormatType = 'dollar' | 'percent' | 'number' | 'ratio';

interface MetricConfig {
  key: keyof Metrics;
  label: string;
  icon: LucideIcon;
  format: FormatType;
  benchmark: number;
  benchmarkLabel: string;
  higherIsBetter: boolean;
}

const metricConfigs: MetricConfig[] = [
  // Row 1
  { key: 'medianHomePrice', label: 'Median Home Price', icon: Home, format: 'dollar', benchmark: 350000, benchmarkLabel: 'National avg: $350K', higherIsBetter: false },
  { key: 'medianRent', label: 'Median Rent', icon: DollarSign, format: 'dollar', benchmark: 1800, benchmarkLabel: 'National avg: $1,800', higherIsBetter: true },
  { key: 'rentYield', label: 'Rent Yield', icon: TrendingUp, format: 'percent', benchmark: 5.5, benchmarkLabel: 'Target: 5.5%+', higherIsBetter: true },
  { key: 'priceGrowth', label: 'Price Growth (YoY)', icon: BarChart3, format: 'percent', benchmark: 4.0, benchmarkLabel: 'Avg: 4.0%', higherIsBetter: true },
  { key: 'populationGrowth', label: 'Population Growth', icon: Users, format: 'percent', benchmark: 1.0, benchmarkLabel: 'Avg: 1.0%', higherIsBetter: true },
  // Row 2
  { key: 'employmentRate', label: 'Employment Rate', icon: Briefcase, format: 'percent', benchmark: 95.0, benchmarkLabel: 'National: 95%', higherIsBetter: true },
  { key: 'mortgageRate', label: 'Mortgage Rate', icon: Percent, format: 'percent', benchmark: 6.5, benchmarkLabel: '30yr fixed avg', higherIsBetter: false },
  { key: 'inventory', label: 'Active Inventory', icon: Package, format: 'number', benchmark: 5000, benchmarkLabel: 'Balanced: 5K+', higherIsBetter: true },
  { key: 'daysOnMarket', label: 'Days on Market', icon: Clock, format: 'number', benchmark: 30, benchmarkLabel: 'Avg: 30 days', higherIsBetter: false },
  { key: 'priceToRent', label: 'Price-to-Rent Ratio', icon: BarChart3, format: 'ratio', benchmark: 16, benchmarkLabel: 'Buy < 16, Rent > 20', higherIsBetter: false },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatValue(value: number, format: FormatType): string {
  switch (format) {
    case 'dollar':
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${value.toLocaleString()}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
      return value.toLocaleString();
    case 'ratio':
      return value.toFixed(1);
  }
}

/* ------------------------------------------------------------------ */
/*  MetricTile                                                         */
/* ------------------------------------------------------------------ */

function MetricTile({ config, value }: { config: MetricConfig; value: number }) {
  const Icon = config.icon;
  const isAbove = value > config.benchmark;
  const isFavorable = config.higherIsBetter ? isAbove : !isAbove;
  const isNeutral = Math.abs(value - config.benchmark) / config.benchmark < 0.02;

  return (
    <Card variant="default" padding="md" className="group hover:border-gold/20 transition-all duration-200">
      {/* Top: icon + label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-border/50">
          <Icon className="h-4 w-4 text-muted" />
        </div>
        <span className="text-xs font-body font-medium text-muted truncate">
          {config.label}
        </span>
      </div>

      {/* Middle: value + trend */}
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-display font-bold text-white tracking-tight">
          {formatValue(value, config.format)}
        </span>
        {!isNeutral && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              isFavorable ? 'bg-green/10 text-green' : 'bg-red/10 text-red',
            )}
          >
            {isAbove ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {config.format === 'percent' || config.format === 'ratio'
              ? `${Math.abs(value - config.benchmark).toFixed(1)}`
              : ''}
          </span>
        )}
        {isNeutral && (
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-muted/10 text-muted">
            ~Avg
          </span>
        )}
      </div>

      {/* Bottom: benchmark */}
      <p className="text-[11px] font-body text-muted/70 leading-tight">
        {config.benchmarkLabel}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  MarketMetrics                                                      */
/* ------------------------------------------------------------------ */

export default function MarketMetrics({ metrics }: MarketMetricsProps) {
  const row1 = metricConfigs.slice(0, 5);
  const row2 = metricConfigs.slice(5, 10);

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-white mb-6">
        Market Metrics
      </h2>

      {/* Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        {row1.map((config) => (
          <MetricTile
            key={config.key}
            config={config}
            value={metrics[config.key]}
          />
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {row2.map((config) => (
          <MetricTile
            key={config.key}
            config={config}
            value={metrics[config.key]}
          />
        ))}
      </div>
    </div>
  );
}
