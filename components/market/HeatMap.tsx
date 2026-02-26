'use client';

import { useState } from 'react';
import { MapPin, TrendingUp, Users, Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarketMetrics {
  medianPrice: number;
  rentYield: number;
  priceGrowth: number;
  population: number;
  employment: number;
}

interface Market {
  name: string;
  state: string;
  score: number;
  metrics: MarketMetrics;
}

interface HeatMapProps {
  markets: Market[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getScoreColor(score: number) {
  if (score >= 80) return { bg: 'bg-green/15', border: 'border-green/30', text: 'text-green', dot: 'bg-green' };
  if (score >= 60) return { bg: 'bg-gold/15', border: 'border-gold/30', text: 'text-gold', dot: 'bg-gold' };
  return { bg: 'bg-red/15', border: 'border-red/30', text: 'text-red', dot: 'bg-red' };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatPopulation(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Detail Panel                                                       */
/* ------------------------------------------------------------------ */

function DetailPanel({ market, onClose }: { market: Market; onClose: () => void }) {
  const color = getScoreColor(market.score);
  const { metrics } = market;

  const rows = [
    { label: 'Median Price', value: formatCurrency(metrics.medianPrice), icon: Building2 },
    { label: 'Rent Yield', value: `${metrics.rentYield.toFixed(1)}%`, icon: TrendingUp },
    { label: 'Price Growth', value: `${metrics.priceGrowth >= 0 ? '+' : ''}${metrics.priceGrowth.toFixed(1)}%`, icon: TrendingUp },
    { label: 'Population', value: formatPopulation(metrics.population), icon: Users },
    { label: 'Employment', value: `${metrics.employment.toFixed(1)}%`, icon: Users },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card variant="elevated" padding="lg" className="w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', color.bg)}>
            <MapPin className={cn('h-5 w-5', color.text)} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">{market.name}</h3>
            <p className="text-sm text-muted">{market.state}</p>
          </div>
          <Badge variant={market.score >= 80 ? 'success' : market.score >= 60 ? 'default' : 'danger'} className="ml-auto">
            Score: {market.score}
          </Badge>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3 border border-border"
            >
              <div className="flex items-center gap-2.5">
                <row.icon className="h-4 w-4 text-muted" />
                <span className="text-sm font-body text-muted">{row.label}</span>
              </div>
              <span className="text-sm font-semibold text-white">{row.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HeatMap                                                            */
/* ------------------------------------------------------------------ */

export default function HeatMap({ markets }: HeatMapProps) {
  const [selected, setSelected] = useState<Market | null>(null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-bold text-white">Market Heat Map</h2>
        <span className="text-sm text-muted">{markets.length} markets</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {markets.map((market) => {
          const color = getScoreColor(market.score);

          return (
            <Card
              key={`${market.name}-${market.state}`}
              variant="interactive"
              padding="md"
              className={cn('relative overflow-hidden', color.border)}
              onClick={() => setSelected(market)}
            >
              {/* Score indicator bar */}
              <div className={cn('absolute top-0 left-0 right-0 h-1', color.dot)} />

              <div className="flex items-start justify-between mb-3 pt-1">
                <div className="flex items-center gap-2">
                  <MapPin className={cn('h-4 w-4', color.text)} />
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">{market.name}</p>
                    <p className="text-xs text-muted">{market.state}</p>
                  </div>
                </div>
                <span className={cn('text-lg font-display font-bold', color.text)}>
                  {market.score}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted">
                  <Building2 className="h-3 w-3" />
                  <span>{formatCurrency(market.metrics.medianPrice)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted">
                  <TrendingUp className="h-3 w-3" />
                  <span>{market.metrics.rentYield.toFixed(1)}% yield</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted">
                  <Users className="h-3 w-3" />
                  <span>{formatPopulation(market.metrics.population)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted">
                  <TrendingUp className="h-3 w-3" />
                  <span>{market.metrics.priceGrowth >= 0 ? '+' : ''}{market.metrics.priceGrowth.toFixed(1)}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green" />
          <span>Strong (80+)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-gold" />
          <span>Moderate (60-79)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red" />
          <span>Weak (&lt;60)</span>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailPanel market={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
