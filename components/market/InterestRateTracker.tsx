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
        <Minus className="h-3 w-3 text-[#8891a0]" />
        <span className="text-[11px] font-semibold text-[#8891a0] font-sans">
          Unchanged
        </span>
      </div>
    );
  }

  // For mortgage rates: down is green (good for borrowers), up is red
  const isGood = diff < 0;
  const color = isGood ? '#22c55e' : '#ef4444';
  const Icon = diff < 0 ? TrendingDown : TrendingUp;
  const sign = diff > 0 ? '+' : '';

  return (
    <div className="flex items-center gap-1">
      <Icon className="h-3 w-3" style={{ color }} />
      <span className="text-[11px] font-semibold font-sans" style={{ color }}>
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
    <div className="flex-1 rounded-lg bg-[#0d1118] border border-[#1E2530] p-3.5 hover:border-[#C9A84C]/20 transition-colors">
      <p className="text-[10px] text-[#8891a0] uppercase tracking-wider font-sans mb-1">
        {rate.label}
      </p>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-2xl font-bold font-sans" style={{ color: accentColor }}>
          {rate.current.toFixed(2)}
        </span>
        <span className="text-sm text-[#8891a0] font-sans">%</span>
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
    <div className="rounded-xl bg-[#111620] border border-[#1E2530] overflow-hidden">
      {/* Gold accent top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#C9A84C]/0 via-[#C9A84C]/60 to-[#C9A84C]/0" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Syne, sans-serif' }}>
            Interest Rate Tracker
          </h3>
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              {/* Pulsing green dot */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
              </span>
              <div className="flex items-center gap-1 text-[10px] text-[#8891a0] font-sans">
                <Clock className="h-3 w-3" />
                <span>Updated {formattedDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rate Cards */}
        <div className="flex gap-3 mb-5">
          <RateCard rate={rates.mortgage30yr} accentColor="#C9A84C" />
          <RateCard rate={rates.mortgage15yr} accentColor="#22c55e" />
          <RateCard rate={rates.fedFunds} accentColor="#6366f1" />
        </div>

        {/* Historical Chart */}
        {history.length > 0 && (
          <div className="rounded-lg bg-[#0d1118] border border-[#1E2530] p-4">
            <h4 className="text-[10px] font-semibold text-[#8891a0] uppercase tracking-wider mb-3 font-sans">
              2-Year Rate History
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,37,48,0.6)" />
                <XAxis
                  dataKey="date"
                  stroke="#555"
                  fontSize={9}
                  fontFamily="DM Sans"
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#555"
                  fontSize={9}
                  fontFamily="DM Sans"
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={['auto', 'auto']}
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
                  wrapperStyle={{ fontSize: '10px', fontFamily: 'DM Sans', color: '#8891a0' }}
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
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="mortgage15yr"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="fedFunds"
                  stroke="#6366f1"
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
