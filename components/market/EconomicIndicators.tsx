'use client';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Briefcase,
  Building,
  DollarSign,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IndicatorValue {
  value: number;
  change: number; // positive = up, negative = down
  formatted: string;
}

interface EconomicIndicatorsProps {
  indicators: {
    unemploymentRate: IndicatorValue;
    jobGrowthYoY: IndicatorValue;
    populationGrowth: IndicatorValue;
    newPermits90d: IndicatorValue;
    medianHouseholdIncome: IndicatorValue;
  };
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

interface IndicatorConfig {
  key: keyof EconomicIndicatorsProps['indicators'];
  label: string;
  icon: typeof Users;
  /** For this indicator, is a positive change "good" or "bad"? */
  positiveIsGood: boolean;
}

const INDICATOR_CONFIGS: IndicatorConfig[] = [
  { key: 'unemploymentRate', label: 'Unemployment', icon: Users, positiveIsGood: false },
  { key: 'jobGrowthYoY', label: 'Job Growth YoY', icon: Briefcase, positiveIsGood: true },
  { key: 'populationGrowth', label: 'Pop. Growth', icon: Users, positiveIsGood: true },
  { key: 'newPermits90d', label: 'New Permits (90d)', icon: Building, positiveIsGood: true },
  { key: 'medianHouseholdIncome', label: 'Median HHI', icon: DollarSign, positiveIsGood: true },
];

/* ------------------------------------------------------------------ */
/*  Single Indicator Card                                              */
/* ------------------------------------------------------------------ */

function IndicatorCard({
  config,
  data,
}: {
  config: IndicatorConfig;
  data: IndicatorValue;
}) {
  const { change } = data;
  const isUp = change > 0;
  const isDown = change < 0;
  const isNeutral = Math.abs(change) < 0.05;

  // Determine color: good = green, bad = red, neutral = muted
  let trendColor = '#4A6080';
  if (!isNeutral) {
    const isGood = (isUp && config.positiveIsGood) || (isDown && !config.positiveIsGood);
    trendColor = isGood ? '#c9a84c' : '#DC2626';
  }

  const TrendIcon = isNeutral ? Minus : isUp ? TrendingUp : TrendingDown;
  const Icon = config.icon as React.ComponentType<{ className?: string; strokeWidth?: number }>;

  return (
    <div className="flex-1 min-w-[140px] rounded-lg p-3.5 hover:border-gold/20 transition-colors group relative overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      {/* Hover accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-gold/30 transition-all duration-500" />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
          <Icon className="h-3.5 w-3.5 text-muted" />
        </div>
        <p className="label text-muted leading-tight" style={{ fontSize: '10px' }}>
          {config.label}
        </p>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-xl font-bold text-white font-mono">
          {data.formatted}
        </span>
        <div className="flex items-center gap-0.5">
          <TrendIcon className="h-3 w-3" style={{ color: trendColor, filter: trendColor !== '#4A6080' ? `drop-shadow(0 0 4px ${trendColor}40)` : 'none' }} />
          <span className="text-[10px] font-semibold font-mono" style={{ color: trendColor }}>
            {isNeutral
              ? 'Flat'
              : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EconomicIndicators({ indicators }: EconomicIndicatorsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {INDICATOR_CONFIGS.map((config) => (
        <IndicatorCard
          key={config.key}
          config={config}
          data={indicators[config.key]}
        />
      ))}
    </div>
  );
}
