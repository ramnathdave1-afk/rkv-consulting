'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, Clock } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RateData {
  current: number;
  weekAgo: number;
  label: string;
}

interface HistoricalPoint {
  date: string;
  mortgage30yr: number;
  mortgage15yr: number;
  fedFunds: number;
}

interface InterestRateTrackerProps {
  rates: {
    mortgage30yr: RateData;
    mortgage15yr: RateData;
    fedFunds: RateData;
  };
  history?: HistoricalPoint[];
  lastUpdated?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function RateChange({ current, weekAgo }: { current: number; weekAgo: number }) {
  const diff = current - weekAgo;
  const absDiff = Math.abs(diff);

  if (Math.abs(diff) < 0.005) {
    return (
      <div className="flex items-center gap-1">
        <Minus className="h-3 w-3 text-muted" />
        <span className="text-[11px] font-semibold text-muted font-mono">
          Unchanged
        </span>
      </div>
    );
  }

  // For mortgage rates: down is green (good for borrowers), up is red
  const isGood = diff < 0;
  const color = isGood ? '#059669' : '#DC2626';
  const Icon = diff < 0 ? TrendingDown : TrendingUp;
  const sign = diff > 0 ? '+' : '';

  return (
    <div className="flex items-center gap-1">
      <Icon className="h-3 w-3" style={{ color }} />
      <span className="text-[11px] font-semibold font-mono" style={{ color }}>
        {sign}{absDiff.toFixed(2)}% WoW
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rate Card                                                          */
/* ------------------------------------------------------------------ */

function RateCard({ rate, accentColor }: { rate: RateData; accentColor: string }) {
  return (
    <div className="flex-1 rounded-lg p-3.5 rounded-lg hover:border-gold/20 transition-colors" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
      <p className="label text-muted mb-1" style={{ fontSize: '10px' }}>
        {rate.label}
      </p>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-2xl font-bold font-mono" style={{ color: accentColor }}>
          {rate.current.toFixed(2)}
        </span>
        <span className="text-sm text-muted font-mono">%</span>
      </div>
      <RateChange current={rate.current} weekAgo={rate.weekAgo} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InterestRateTracker({
  rates,
  history = [],
  lastUpdated,
}: InterestRateTrackerProps) {
  const formattedDate = useMemo(() => {
    if (!lastUpdated) return null;
    try {
      return new Date(lastUpdated).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return lastUpdated;
    }
  }, [lastUpdated]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
      {/* Cyan accent top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#059669]/0 via-[#059669]/60 to-[#059669]/0" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="label text-gold">
            INTEREST RATE TRACKER //
          </h3>
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              {/* Pulsing green dot */}
              <span className="pulse-dot" />
              <div className="flex items-center gap-1 text-[10px] text-muted font-mono">
                <Clock className="h-3 w-3" />
                <span>Updated {formattedDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rate Cards */}
        <div className="flex gap-3 mb-5">
          <RateCard rate={rates.mortgage30yr} accentColor="#059669" />
          <RateCard rate={rates.mortgage15yr} accentColor="#059669" />
          <RateCard rate={rates.fedFunds} accentColor="#0EA5E9" />
        </div>

        {/* Historical Chart */}
        {history.length > 0 && (
          <div className="rounded-lg p-4" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
            <h4 className="label text-muted mb-3" style={{ fontSize: '10px' }}>
              2-YEAR RATE HISTORY
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,37,48,0.6)" />
                <XAxis
                  dataKey="date"
                  stroke="#1E2D40"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#1E2D40"
                  fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={['auto', 'auto']}
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
                  formatter={((v: any, name: any) => {
                    const labels: Record<string, string> = {
                      mortgage30yr: '30yr Fixed',
                      mortgage15yr: '15yr Fixed',
                      fedFunds: 'Fed Funds',
                    };
                    return [`${Number(v).toFixed(2)}%`, labels[name] || name];
                  }) as any}
                />
                <Legend
                  iconType="line"
                  wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#4A6080' }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      mortgage30yr: '30yr Fixed',
                      mortgage15yr: '15yr Fixed',
                      fedFunds: 'Fed Funds',
                    };
                    return labels[value] || value;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="mortgage30yr"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="mortgage15yr"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="fedFunds"
                  stroke="#0EA5E9"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 3"
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
