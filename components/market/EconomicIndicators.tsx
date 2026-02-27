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

  // Determine color: good = green, bad = red, neutral = gray
  let trendColor = '#8891a0';
  if (!isNeutral) {
    const isGood = (isUp && config.positiveIsGood) || (isDown && !config.positiveIsGood);
    trendColor = isGood ? '#22c55e' : '#ef4444';
  }

  const TrendIcon = isNeutral ? Minus : isUp ? TrendingUp : TrendingDown;
  const Icon = config.icon;

  return (
    <div className="flex-1 min-w-[140px] rounded-lg bg-[#111620] border border-[#1E2530] p-3.5 hover:border-[#C9A84C]/20 transition-colors group relative overflow-hidden">
      {/* Hover accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-[#C9A84C]/30 transition-all duration-500" />

      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0d1118] border border-[#1E2530]">
          <Icon className="h-3.5 w-3.5 text-[#8891a0]" />
        </div>
        <p className="text-[10px] text-[#8891a0] uppercase tracking-wider font-sans leading-tight">
          {config.label}
        </p>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-lg font-bold text-white font-sans">
          {data.formatted}
        </span>
        <div className="flex items-center gap-0.5">
          <TrendIcon className="h-3 w-3" style={{ color: trendColor }} />
          <span className="text-[10px] font-semibold font-sans" style={{ color: trendColor }}>
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
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#1E2530] scrollbar-track-transparent">
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
