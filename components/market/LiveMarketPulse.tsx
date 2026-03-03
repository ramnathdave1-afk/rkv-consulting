'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PulseData {
  daily: {
    treasury_10y: number | null;
    mortgage_30y: number | null;
  };
  monthly: {
    housing_permits: number | null;
    existing_home_sales: number | null;
  };
  fetched_at: string;
  live: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return 'Just now';
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LiveMarketPulse({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPulse = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market/pulse');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load live data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
    const t = setInterval(fetchPulse, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) {
    return (
      <div
        className={cn(
          'rounded-lg border border-[#1e1e1e] bg-[#111111] p-4 flex items-center gap-4',
          className
        )}
      >
        <div className="flex items-center gap-2 text-muted">
          <Activity className="h-4 w-4 animate-pulse" />
          <span className="font-mono text-[11px]">Loading live indicators…</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className={cn(
          'rounded-lg border border-red/20 bg-red/5 p-4 flex items-center justify-between',
          className
        )}
      >
        <span className="font-mono text-[11px] text-red">{error}</span>
        <button
          type="button"
          onClick={fetchPulse}
          className="text-[11px] text-gold hover:text-gold-light flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  const d = data!;
  const { daily, monthly, fetched_at } = d;

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-lg border border-[#1e1e1e] bg-[#111111] px-4 py-3 flex flex-wrap items-center gap-6',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" aria-hidden />
          <span className="font-mono text-[10px] text-muted uppercase tracking-wider">Live</span>
        </div>
        {daily.treasury_10y != null && (
          <div>
            <span className="font-mono text-[11px] text-muted mr-1">10Y Treasury</span>
            <span className="font-mono text-[13px] font-semibold text-white">{daily.treasury_10y.toFixed(2)}%</span>
          </div>
        )}
        {daily.mortgage_30y != null && (
          <div>
            <span className="font-mono text-[11px] text-muted mr-1">30Y Mtg</span>
            <span className="font-mono text-[13px] font-semibold text-white">{daily.mortgage_30y.toFixed(2)}%</span>
          </div>
        )}
        {monthly.housing_permits != null && (
          <div>
            <span className="font-mono text-[11px] text-muted mr-1">Permits</span>
            <span className="font-mono text-[13px] font-semibold text-white">{(monthly.housing_permits * 1000).toLocaleString()}</span>
          </div>
        )}
        {monthly.existing_home_sales != null && (
          <div>
            <span className="font-mono text-[11px] text-muted mr-1">Existing sales</span>
            <span className="font-mono text-[13px] font-semibold text-white">{monthly.existing_home_sales.toFixed(2)}M</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[9px] text-muted-deep">{formatTime(fetched_at)}</span>
          <button
            type="button"
            onClick={fetchPulse}
            disabled={loading}
            className="p-1 rounded text-muted hover:text-white disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[#1e1e1e] bg-[#111111] overflow-hidden',
        className
      )}
    >
      <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green" />
          <span className="font-body text-[11px] font-semibold text-white uppercase tracking-wider">
            Live market pulse
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" aria-hidden />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-muted">{formatTime(fetched_at)}</span>
          <button
            type="button"
            onClick={fetchPulse}
            disabled={loading}
            className="p-1.5 rounded text-muted hover:text-white hover:bg-white/5 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
        {daily.treasury_10y != null && (
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-wider mb-0.5">10Y Treasury</p>
            <p className="font-mono text-lg font-semibold text-white">{daily.treasury_10y.toFixed(2)}%</p>
            <p className="font-body text-[10px] text-muted-deep">Cap rate floor proxy</p>
          </div>
        )}
        {daily.mortgage_30y != null && (
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-wider mb-0.5">30Y mortgage</p>
            <p className="font-mono text-lg font-semibold text-white">{daily.mortgage_30y.toFixed(2)}%</p>
            <p className="font-body text-[10px] text-muted-deep">Freddie Mac primary</p>
          </div>
        )}
        {monthly.housing_permits != null && (
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-wider mb-0.5">Housing permits</p>
            <p className="font-mono text-lg font-semibold text-white">{(monthly.housing_permits * 1000).toLocaleString()}</p>
            <p className="font-body text-[10px] text-muted-deep">Monthly (SAAR)</p>
          </div>
        )}
        {monthly.existing_home_sales != null && (
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-wider mb-0.5">Existing home sales</p>
            <p className="font-mono text-lg font-semibold text-white">{monthly.existing_home_sales.toFixed(2)}M</p>
            <p className="font-body text-[10px] text-muted-deep">NAR, monthly SAAR</p>
          </div>
        )}
      </div>
    </div>
  );
}
