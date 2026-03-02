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
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      {/* Cyan accent top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#c9a84c]/0 via-[#c9a84c]/60 to-[#c9a84c]/0" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="label text-gold">
            Market Comparison
          </h3>
          <span className="text-[10px] text-muted font-mono">
            {markets.length}/3 markets
          </span>
        </div>

        {markets.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full mb-4" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
              <Plus className="h-5 w-5 text-muted" />
            </div>
            <p className="text-sm text-muted font-display mb-1">No markets selected</p>
            <p className="text-xs text-muted-deep mb-4">
              Add up to 3 markets to compare side by side
            </p>
            <button
              onClick={onAddMarket}
              className="inline-flex items-center gap-2 rounded-lg border border-gold text-gold px-4 py-2 text-sm font-semibold hover:bg-gold/10 transition-colors font-body uppercase tracking-wider"
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
              <div className="label text-muted-deep self-end pb-1" style={{ fontSize: '10px' }}>
                Metric
              </div>

              {/* Market headers */}
              {markets.map((market) => (
                <div
                  key={market.id}
                  className="rounded-lg p-3 relative group" style={{ background: '#111111', border: '1px solid #1e1e1e' }}
                >
                  <button
                    onClick={() => onRemoveMarket(market.id)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center text-muted-deep hover:text-red hover:bg-red/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-sm font-bold text-white font-display truncate">
                    {market.name}
                  </p>
                  <p className="text-[10px] text-muted font-body">
                    {market.state}
                  </p>
                </div>
              ))}

              {/* Add Market button column */}
              {canAddMore && (
                <button
                  onClick={onAddMarket}
                  className="rounded-lg border border-dashed border-border p-3 flex flex-col items-center justify-center gap-1 text-muted hover:border-gold/40 hover:text-gold transition-all min-w-[100px]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[10px] font-body">Add</span>
                </button>
              )}
            </div>

            {/* Metric Rows */}
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-3 items-center py-2 px-1 rounded-lg hover:bg-white/[0.02] transition-colors"
                  style={{ gridTemplateColumns: `140px repeat(${markets.length}, 1fr)${canAddMore ? ' auto' : ''}` }}
                >
                  {/* Label */}
                  <p className="text-[11px] text-muted font-body truncate">
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
                            ? 'bg-gold/10 border border-gold/25'
                            : 'bg-transparent'
                        }`}
                      >
                        {isBest && (
                          <Trophy className="h-3 w-3 text-gold flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm font-semibold font-mono ${
                            isBest ? 'text-gold' : 'text-white'
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
              <div className="mt-4 pt-4 border-t border-border">
                <div
                  className="grid gap-3 items-center py-2 px-1"
                  style={{ gridTemplateColumns: `140px repeat(${markets.length}, 1fr)${canAddMore ? ' auto' : ''}` }}
                >
                  <p className="label text-gold" style={{ fontSize: '11px' }}>
                    Inv. Score
                  </p>
                  {markets.map((market, _idx) => {
                    const score = market.investmentScore ?? 0;
                    const allScores = markets.map((m) => m.investmentScore ?? 0);
                    const isBest = score === Math.max(...allScores) && markets.length > 1;

                    let scoreColor = '#4A6080';
                    if (score >= 75) scoreColor = '#c9a84c';
                    else if (score >= 55) scoreColor = '#c9a84c';
                    else if (score < 35) scoreColor = '#DC2626';

                    return (
                      <div
                        key={market.id}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 ${
                          isBest
                            ? 'bg-gold/10 border border-gold/25'
                            : 'bg-transparent'
                        }`}
                      >
                        {isBest && (
                          <Trophy className="h-3 w-3 text-gold flex-shrink-0" />
                        )}
                        <span
                          className="text-sm font-bold font-mono"
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
