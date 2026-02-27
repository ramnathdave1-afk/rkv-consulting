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
  Sparkles,
  Shield,
} from 'lucide-react';
import type { HeatMapCityMarketData } from '@/types';
import { HEAT_MAP_METRIC_CONFIGS } from '@/lib/market/data';
import { getInvestmentPotentialColor } from '@/lib/market/colors';

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
  if (change > 0) return { icon: TrendingUp, color: '#22c55e', label: `+${change.toFixed(1)}%` };
  if (change < 0) return { icon: TrendingDown, color: '#ef4444', label: `${change.toFixed(1)}%` };
  return { icon: TrendingUp, color: '#8891a0', label: '0.0%' };
}

function getScoreBadge(score: number) {
  if (score >= 75) return { label: 'Strong Buy', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)', text: '#22c55e' };
  if (score >= 55) return { label: 'Moderate', bg: 'rgba(201,168,76,0.15)', border: 'rgba(201,168,76,0.3)', text: '#C9A84C' };
  if (score >= 35) return { label: 'Neutral', bg: 'rgba(136,145,160,0.15)', border: 'rgba(136,145,160,0.3)', text: '#8891a0' };
  return { label: 'Caution', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' };
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
    <div className="rounded-lg bg-[#0d1118] border border-[#1E2530] p-3 group relative overflow-hidden hover:border-[#C9A84C]/20 transition-colors">
      {/* Top hover accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-[#C9A84C]/30 transition-all duration-500" />

      <p className="text-[10px] text-[#8891a0] uppercase tracking-wider font-sans mb-1.5">
        {label}
      </p>
      <div className="flex items-end justify-between gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-white font-sans">{value}</span>
          {unit && <span className="text-[10px] text-[#8891a0] font-sans">{unit}</span>}
        </div>
        {arrow && ArrowIcon && (
          <div className="flex items-center gap-0.5">
            <ArrowIcon className="h-3 w-3" style={{ color: arrow.color }} />
            <span className="text-[10px] font-semibold font-sans" style={{ color: arrow.color }}>
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
    <div className="h-full flex flex-col bg-[#111620] border-l border-[#1E2530] overflow-hidden animate-in slide-in-from-right-4 duration-300">
      {/* ── Header ── */}
      <div className="relative">
        {/* Top gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

        <div className="flex items-center justify-between p-5 pb-4 border-b border-[#1E2530]/60">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
                {city.name}
              </h2>
              <span className="flex-shrink-0 inline-flex items-center rounded-md bg-[#C9A84C]/10 border border-[#C9A84C]/25 px-2 py-0.5 text-[10px] font-semibold text-[#C9A84C] uppercase tracking-wider">
                {city.state}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-[#8891a0] font-sans">
                Pop. {city.population.toLocaleString()}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#1E2530]" />
              <span className="text-[11px] text-[#8891a0] font-sans">
                HHI ${(city.medianHouseholdIncome / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg border border-[#1E2530] flex items-center justify-center text-[#8891a0] hover:text-white hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-[#1E2530] scrollbar-track-transparent">
        {/* Investment Potential Score */}
        <div className="flex items-center justify-between rounded-xl bg-[#0d1118] border border-[#1E2530] p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: `${scoreColor}20`, border: `1.5px solid ${scoreColor}40` }}
            >
              <Shield className="h-5 w-5" style={{ color: scoreColor }} />
            </div>
            <div>
              <p className="text-xs text-[#8891a0] font-sans">Investment Potential</p>
              <p className="text-lg font-bold text-white font-sans">{investmentScore}/100</p>
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
          <div className="rounded-xl bg-[#0d1118] border border-[#1E2530] p-4">
            <h4 className="text-[10px] font-semibold text-[#C9A84C] uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ fontFamily: 'Syne, sans-serif' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />
              12-Month Price Trend
            </h4>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trends} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="detailPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,37,48,0.6)" />
                <XAxis
                  dataKey="month"
                  stroke="#555"
                  fontSize={9}
                  fontFamily="DM Sans"
                  interval={2}
                  tickLine={false}
                />
                <YAxis
                  stroke="#555"
                  fontSize={9}
                  fontFamily="DM Sans"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(17,22,32,0.96)',
                    border: '1px solid #1E2530',
                    borderRadius: '10px',
                    fontFamily: 'DM Sans',
                    fontSize: '11px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: any) => [`$${Number(v).toLocaleString()}`, 'Price']) as any}
                />
                <Area
                  type="monotone"
                  dataKey="medianPrice"
                  stroke="#C9A84C"
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
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all ${
            isTracked
              ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/20'
              : 'bg-[#C9A84C] text-[#080A0E] hover:bg-[#d4b45c]'
          }`}
        >
          {isTracked ? (
            <>
              <BookmarkCheck className="h-4 w-4" />
              Tracking This Market
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              Track This Market
            </>
          )}
        </button>

        {/* AI Market Brief Placeholder */}
        <div className="rounded-xl bg-[#0d1118] border border-[#C9A84C]/15 p-4">
          <h4 className="text-[10px] font-semibold text-[#C9A84C] uppercase tracking-wider mb-3 flex items-center gap-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A84C] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9A84C]" />
            </span>
            AI Market Brief
          </h4>
          <div className="flex items-center gap-3 rounded-lg bg-[#111620] border border-[#1E2530] p-4">
            <Sparkles className="h-5 w-5 text-[#C9A84C] flex-shrink-0" />
            <div>
              <p className="text-xs text-[#8891a0] font-sans leading-relaxed">
                AI-generated market analysis coming soon. This will provide investment
                insights, risk assessment, and opportunity identification powered by
                real-time data for {city.name}, {city.state}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
