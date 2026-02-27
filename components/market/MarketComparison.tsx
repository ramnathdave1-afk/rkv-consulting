'use client';

import { useMemo } from 'react';
import { X, Plus, Trophy } from 'lucide-react';
import type { HeatMapCityMarketData, HeatMapPropertyType } from '@/types';
import { HEAT_MAP_METRIC_CONFIGS } from '@/lib/market/data';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MarketComparisonProps {
  markets: HeatMapCityMarketData[];
  onAddMarket: () => void;
  onRemoveMarket: (cityId: string) => void;
  propertyType?: HeatMapPropertyType;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MetricRow {
  key: string;
  label: string;
  values: { cityId: string; raw: number; formatted: string }[];
  bestIndex: number; // index into values of the "best" value
  higherIsBetter: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * For each metric, determine whether a higher or lower value is "better"
 * for an investor.
 */
function isHigherBetter(key: string): boolean {
  switch (key) {
    case 'medianRent':
    case 'yoyChange':
    case 'populationGrowth':
      return true; // Higher rent/appreciation/growth = better
    case 'medianPrice':
    case 'pricePerSqft':
    case 'daysOnMarket':
    case 'monthsOfSupply':
      return false; // Lower cost/DOM/supply = better for buyers
    case 'activeInventory':
      return true; // More options = better for buyers
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MarketComparison({
  markets,
  onAddMarket,
  onRemoveMarket,
  propertyType = 'all',
}: MarketComparisonProps) {
  // Build comparison rows
  const rows: MetricRow[] = useMemo(() => {
    if (markets.length === 0) return [];

    return HEAT_MAP_METRIC_CONFIGS.map((config) => {
      const higherIsBetter = isHigherBetter(config.key);

      const values = markets.map((market) => {
        let raw: number;
        if (config.key === 'populationGrowth') {
          raw = market.populationGrowth;
        } else {
          raw = market.byType[propertyType]?.[config.key as keyof typeof market.byType.all] ?? 0;
        }
        return {
          cityId: market.id,
          raw,
          formatted: config.format(raw),
        };
      });

      // Determine best
      let bestIndex = 0;
      values.forEach((v, i) => {
        if (higherIsBetter) {
          if (v.raw > values[bestIndex].raw) bestIndex = i;
        } else {
          if (v.raw < values[bestIndex].raw) bestIndex = i;
        }
      });

      return {
        key: config.key,
        label: config.shortLabel,
        values,
        bestIndex,
        higherIsBetter,
      };
    });
  }, [markets, propertyType]);

  const canAddMore = markets.length < 3;

  return (
    <div className="rounded-xl bg-[#111620] border border-[#1E2530] overflow-hidden">
      {/* Gold accent top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#C9A84C]/0 via-[#C9A84C]/60 to-[#C9A84C]/0" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Syne, sans-serif' }}>
            Market Comparison
          </h3>
          <span className="text-[10px] text-[#8891a0] font-sans">
            {markets.length}/3 markets
          </span>
        </div>

        {markets.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d1118] border border-[#1E2530] mb-4">
              <Plus className="h-5 w-5 text-[#8891a0]" />
            </div>
            <p className="text-sm text-[#8891a0] font-sans mb-1">No markets selected</p>
            <p className="text-xs text-[#555] font-sans mb-4">
              Add up to 3 markets to compare side by side
            </p>
            <button
              onClick={onAddMarket}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-[#080A0E] hover:bg-[#d4b45c] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Market
            </button>
          </div>
        ) : (
          <>
            {/* Column Headers */}
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `140px repeat(${markets.length}, 1fr)${canAddMore ? ' auto' : ''}` }}>
              {/* Label column header */}
              <div className="text-[10px] text-[#555] uppercase tracking-wider font-sans self-end pb-1">
                Metric
              </div>

              {/* Market headers */}
              {markets.map((market) => (
                <div
                  key={market.id}
                  className="rounded-lg bg-[#0d1118] border border-[#1E2530] p-3 relative group"
                >
                  <button
                    onClick={() => onRemoveMarket(market.id)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-[#555] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-sm font-bold text-white font-sans truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {market.name}
                  </p>
                  <p className="text-[10px] text-[#8891a0] font-sans">
                    {market.state}
                  </p>
                </div>
              ))}

              {/* Add Market button column */}
              {canAddMore && (
                <button
                  onClick={onAddMarket}
                  className="rounded-lg border border-dashed border-[#1E2530] p-3 flex flex-col items-center justify-center gap-1 text-[#8891a0] hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all min-w-[100px]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[10px] font-sans">Add</span>
                </button>
              )}
            </div>

            {/* Metric Rows */}
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-3 items-center py-2 px-1 rounded-lg hover:bg-[#0d1118]/50 transition-colors"
                  style={{ gridTemplateColumns: `140px repeat(${markets.length}, 1fr)${canAddMore ? ' auto' : ''}` }}
                >
                  {/* Label */}
                  <p className="text-[11px] text-[#8891a0] font-sans truncate">
                    {row.label}
                  </p>

                  {/* Values */}
                  {row.values.map((val, idx) => {
                    const isBest = idx === row.bestIndex && markets.length > 1;
                    return (
                      <div
                        key={val.cityId}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ${
                          isBest
                            ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/25'
                            : 'bg-transparent'
                        }`}
                      >
                        {isBest && (
                          <Trophy className="h-3 w-3 text-[#C9A84C] flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm font-semibold font-sans ${
                            isBest ? 'text-[#C9A84C]' : 'text-white'
                          }`}
                        >
                          {val.formatted}
                        </span>
                      </div>
                    );
                  })}

                  {/* Spacer for add column */}
                  {canAddMore && <div />}
                </div>
              ))}
            </div>

            {/* Investment Score Row (if available) */}
            {markets.some((m) => m.investmentScore !== undefined) && (
              <div className="mt-4 pt-4 border-t border-[#1E2530]">
                <div
                  className="grid gap-3 items-center py-2 px-1"
                  style={{ gridTemplateColumns: `140px repeat(${markets.length}, 1fr)${canAddMore ? ' auto' : ''}` }}
                >
                  <p className="text-[11px] text-[#C9A84C] font-semibold font-sans uppercase tracking-wider">
                    Inv. Score
                  </p>
                  {markets.map((market, _idx) => {
                    const score = market.investmentScore ?? 0;
                    const allScores = markets.map((m) => m.investmentScore ?? 0);
                    const isBest = score === Math.max(...allScores) && markets.length > 1;

                    let scoreColor = '#8891a0';
                    if (score >= 75) scoreColor = '#22c55e';
                    else if (score >= 55) scoreColor = '#C9A84C';
                    else if (score < 35) scoreColor = '#ef4444';

                    return (
                      <div
                        key={market.id}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ${
                          isBest
                            ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/25'
                            : 'bg-transparent'
                        }`}
                      >
                        {isBest && (
                          <Trophy className="h-3 w-3 text-[#C9A84C] flex-shrink-0" />
                        )}
                        <span
                          className="text-sm font-bold font-sans"
                          style={{ color: scoreColor }}
                        >
                          {score}/100
                        </span>
                      </div>
                    );
                  })}
                  {canAddMore && <div />}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
