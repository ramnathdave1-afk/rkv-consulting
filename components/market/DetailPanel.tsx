'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  X,
  TrendingUp,
  TrendingDown,
  Bookmark,
  BookmarkCheck,
  Shield,
} from 'lucide-react';
import type { HeatMapCityMarketData } from '@/types';
import { HEAT_MAP_METRIC_CONFIGS } from '@/lib/market/data';
import { getInvestmentPotentialColor } from '@/lib/market/colors';
import AIMarketBrief from '@/components/market/AIMarketBrief';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface DetailPanelProps {
  city: HeatMapCityMarketData | null;
  onClose: () => void;
  onTrack: (cityId: string) => void;
  isTracked: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMetricValue(key: string, value: number): string {
  const config = HEAT_MAP_METRIC_CONFIGS.find((m) => m.key === key);
  if (config) return config.format(value);
  return String(value);
}

function getYoYArrow(change: number) {
  if (change > 0) return { icon: TrendingUp, color: '#059669', label: `+${change.toFixed(1)}%` };
  if (change < 0) return { icon: TrendingDown, color: '#DC2626', label: `${change.toFixed(1)}%` };
  return { icon: TrendingUp, color: '#4A6080', label: '0.0%' };
}

function getScoreBadge(score: number) {
  if (score >= 75) return { label: 'Strong Buy', bg: 'rgba(5,150,105,0.15)', border: 'rgba(5,150,105,0.3)', text: '#059669' };
  if (score >= 55) return { label: 'Moderate', bg: 'rgba(5,150,105,0.15)', border: 'rgba(5,150,105,0.3)', text: '#059669' };
  if (score >= 35) return { label: 'Neutral', bg: 'rgba(74,127,165,0.15)', border: 'rgba(74,127,165,0.3)', text: '#4A6080' };
  return { label: 'Caution', bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.3)', text: '#DC2626' };
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  yoyChange,
  unit,
}: {
  label: string;
  value: string;
  yoyChange?: number;
  unit?: string;
}) {
  const arrow = yoyChange !== undefined ? getYoYArrow(yoyChange) : null;
  const ArrowIcon = arrow?.icon;

  return (
    <div className="rounded-lg p-3 group relative overflow-hidden hover:border-gold/20 transition-colors" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
      {/* Top hover accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-gold/30 transition-all duration-500" />

      <p className="label text-muted mb-1.5" style={{ fontSize: '10px' }}>
        {label}
      </p>
      <div className="flex items-end justify-between gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-white font-mono">{value}</span>
          {unit && <span className="text-[10px] text-muted font-mono">{unit}</span>}
        </div>
        {arrow && ArrowIcon && (
          <div className="flex items-center gap-0.5">
            <ArrowIcon className="h-3 w-3" style={{ color: arrow.color }} />
            <span className="text-[10px] font-semibold font-mono" style={{ color: arrow.color }}>
              {arrow.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DetailPanel({
  city,
  onClose,
  onTrack,
  isTracked,
}: DetailPanelProps) {
  // Build the 8 metric cards -- must be called before any early return
  const metricCards = useMemo(() => {
    if (!city) return [];
    const d = city.byType['all'];
    return [
      {
        label: 'Median Price',
        value: formatMetricValue('medianPrice', d.medianPrice),
        yoyChange: d.yoyChange,
      },
      {
        label: 'Price / Sqft',
        value: formatMetricValue('pricePerSqft', d.pricePerSqft),
        yoyChange: undefined,
      },
      {
        label: 'Days on Market',
        value: formatMetricValue('daysOnMarket', d.daysOnMarket),
        unit: '',
        yoyChange: undefined,
      },
      {
        label: 'Active Inventory',
        value: formatMetricValue('activeInventory', d.activeInventory),
        yoyChange: undefined,
      },
      {
        label: 'Months of Supply',
        value: formatMetricValue('monthsOfSupply', d.monthsOfSupply),
        yoyChange: undefined,
      },
      {
        label: 'YoY Change',
        value: formatMetricValue('yoyChange', d.yoyChange),
        yoyChange: d.yoyChange,
      },
      {
        label: 'Median Rent',
        value: formatMetricValue('medianRent', d.medianRent),
        unit: '/mo',
        yoyChange: undefined,
      },
      {
        label: 'Pop. Growth',
        value: formatMetricValue('populationGrowth', city.populationGrowth),
        unit: '/yr',
        yoyChange: city.populationGrowth,
      },
    ];
  }, [city]);

  if (!city) return null;

  const trends = city.trends;
  const investmentScore = city.investmentScore ?? 50;
  const scoreBadge = getScoreBadge(investmentScore);
  const scoreColor = getInvestmentPotentialColor(investmentScore);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300" style={{ background: '#0C1018', borderLeft: '1px solid #161E2A' }}>
      {/* ── Header ── */}
      <div className="relative">
        {/* Top cyan accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#059669] to-transparent" />

        <div className="flex items-center justify-between p-5 pb-4 border-b border-border/60">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-xl font-bold text-white tracking-tight truncate">
                {city.name}
              </h2>
              <span className="flex-shrink-0 inline-flex items-center rounded-md bg-gold/10 border border-gold/25 px-2 py-0.5 text-[10px] font-mono font-semibold text-gold uppercase tracking-wider">
                {city.state}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-muted font-mono">
                Pop. {city.population.toLocaleString()}
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[11px] text-muted font-mono">
                HHI ${(city.medianHouseholdIncome / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-white hover:border-gold/40 hover:bg-gold/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Investment Potential Score */}
        <div className="flex items-center justify-between rounded-xl p-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: `${scoreColor}20`, border: `1.5px solid ${scoreColor}40` }}
            >
              <Shield className="h-5 w-5" style={{ color: scoreColor }} />
            </div>
            <div>
              <p className="label text-muted" style={{ fontSize: '10px' }}>Investment Potential</p>
              <p className="text-2xl font-bold text-white font-mono">{investmentScore}<span className="text-sm text-muted">/100</span></p>
            </div>
          </div>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{ background: scoreBadge.bg, border: `1px solid ${scoreBadge.border}`, color: scoreBadge.text }}
          >
            {scoreBadge.label}
          </span>
        </div>

        {/* 8 Metric Cards — 2x4 Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {metricCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              unit={card.unit}
              yoyChange={card.yoyChange}
            />
          ))}
        </div>

        {/* 12-Month Trend Chart */}
        {trends.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
            <h4 className="label text-gold mb-3 flex items-center gap-1.5" style={{ fontSize: '10px' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              12-MONTH PRICE TREND
            </h4>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="detailPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,37,48,0.6)" />
                <XAxis
                  dataKey="month"
                  stroke="#1E2D40"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  interval={2}
                  tickLine={false}
                />
                <YAxis
                  stroke="#1E2D40"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(4,8,16,0.96)',
                    border: '1px solid #161E2A',
                    borderRadius: '10px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color: '#E2E8F0',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: any) => [`$${Number(v).toLocaleString()}`, 'Price']) as any}
                />
                <Area
                  type="monotone"
                  dataKey="medianPrice"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#detailPriceGrad)"
                  animationDuration={800}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Track This Market Button */}
        <button
          onClick={() => onTrack(city.id)}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all font-body uppercase tracking-wider ${
            isTracked
              ? 'bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20'
              : 'bg-transparent border border-gold text-gold hover:bg-gold/10'
          }`}
        >
          {isTracked ? (
            <>
              <BookmarkCheck className="h-4 w-4" />
              TRACKING THIS MARKET
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              TRACK THIS MARKET
            </>
          )}
        </button>

        {/* AI Market Brief */}
        <AIMarketBrief
          city={city.name}
          state={city.state}
          marketData={{
            medianPrice: city.byType['all'].medianPrice,
            pricePerSqft: city.byType['all'].pricePerSqft,
            medianRent: city.byType['all'].medianRent,
            daysOnMarket: city.byType['all'].daysOnMarket,
            activeInventory: city.byType['all'].activeInventory,
            monthsOfSupply: city.byType['all'].monthsOfSupply,
            yoyChange: city.byType['all'].yoyChange,
            populationGrowth: city.populationGrowth,
            capRate: (city.byType['all'].medianRent * 12 * 0.55 / city.byType['all'].medianPrice) * 100,
            rentToPriceRatio: (city.byType['all'].medianRent * 12 / city.byType['all'].medianPrice) * 100,
          }}
        />
      </div>
    </div>
  );
}
