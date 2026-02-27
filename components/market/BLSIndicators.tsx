'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  DollarSign,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BLSData {
  jobGrowth: {
    rate: number
    currentEmployment: number
    previousYear: number
  } | null
  medianIncome: {
    value: number
    percentChange: number
  } | null
  unemployment: {
    rate: number
    previousRate: number
    change: number
  } | null
  metro: string
  state: string
  fetched_at: string
}

interface BLSIndicatorsProps {
  metro: string
  state: string
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function BLSMetricCard({
  label,
  value,
  change,
  icon: Icon,
  positiveIsGood,
  suffix,
  prefix,
}: {
  label: string
  value: string
  change: number | null
  icon: typeof Users
  positiveIsGood: boolean
  suffix?: string
  prefix?: string
}) {
  const isUp = change !== null && change > 0
  const isDown = change !== null && change < 0
  const isNeutral = change === null || Math.abs(change) < 0.05

  let trendColor = '#4A6080'
  if (!isNeutral) {
    const isGood = (isUp && positiveIsGood) || (isDown && !positiveIsGood)
    trendColor = isGood ? '#059669' : '#DC2626'
  }

  const TrendIcon = isNeutral ? Minus : isUp ? TrendingUp : TrendingDown

  return (
    <div className="flex-1 min-w-[160px] rounded-lg p-4 hover:border-gold/20 transition-colors group relative overflow-hidden" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
      {/* Top hover accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-gold/30 transition-all duration-500" />

      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
          <Icon className="h-4 w-4 text-muted" />
        </div>
        <p className="label text-muted leading-tight" style={{ fontSize: '10px' }}>
          {label}
        </p>
      </div>

      <div className="flex items-end justify-between">
        <span className="text-xl font-bold text-white font-mono">
          {prefix}{value}{suffix}
        </span>
        {change !== null && (
          <div className="flex items-center gap-0.5">
            <TrendIcon
              className="h-3 w-3"
              style={{
                color: trendColor,
                filter: trendColor !== '#4A6080' ? `drop-shadow(0 0 4px ${trendColor}40)` : 'none',
              }}
            />
            <span className="text-[10px] font-semibold font-mono" style={{ color: trendColor }}>
              {isNeutral
                ? 'Flat'
                : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shimmer placeholder                                                */
/* ------------------------------------------------------------------ */

function ShimmerCards() {
  return (
    <div className="flex gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-1 min-w-[160px] rounded-lg p-4"
          style={{ background: '#0C1018', border: '1px solid #161E2A' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-md bg-[#161E2A] animate-pulse" />
            <div className="h-3 w-20 rounded bg-[#161E2A] animate-pulse" />
          </div>
          <div className="flex items-end justify-between">
            <div className="h-6 w-16 rounded bg-[#161E2A] animate-pulse" />
            <div className="h-3 w-12 rounded bg-[#161E2A] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BLSIndicators({ metro, state }: BLSIndicatorsProps) {
  const [data, setData] = useState<BLSData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBLSData = useCallback(async () => {
    if (!metro || !state) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ metro, state })
      const res = await fetch(`/api/market/bls?${params.toString()}`)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fetch BLS data')
      }

      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('[BLSIndicators] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load economic data')
    } finally {
      setLoading(false)
    }
  }, [metro, state])

  useEffect(() => {
    fetchBLSData()
  }, [fetchBLSData])

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0C1018', border: '1px solid #161E2A' }}>
      {/* Accent top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#0EA5E9]/0 via-[#0EA5E9]/60 to-[#0EA5E9]/0" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="label text-gold">
              BLS ECONOMIC DATA //
            </h3>
            <span className="text-[10px] font-mono font-semibold bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20 rounded-full px-2 py-0.5">
              {metro}, {state}
            </span>
          </div>
          {data?.fetched_at && (
            <span className="text-[10px] text-muted font-mono">
              Updated {new Date(data.fetched_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Content */}
        {loading && <ShimmerCards />}

        {error && !loading && (
          <div className="flex items-center gap-3 rounded-lg p-4" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <AlertCircle className="h-4 w-4 text-red flex-shrink-0" />
            <p className="text-xs text-muted">{error}</p>
            <button
              onClick={fetchBLSData}
              className="ml-auto text-[10px] font-mono font-semibold text-gold hover:text-white transition-colors uppercase tracking-wider border border-gold/30 rounded-md px-2.5 py-1 hover:bg-gold/10"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {/* Job Growth */}
            <BLSMetricCard
              label="Job Growth"
              value={
                data.jobGrowth
                  ? `${data.jobGrowth.rate >= 0 ? '+' : ''}${data.jobGrowth.rate.toFixed(1)}`
                  : 'N/A'
              }
              suffix="%"
              change={data.jobGrowth?.rate ?? null}
              icon={Briefcase}
              positiveIsGood={true}
            />

            {/* Median Income */}
            <BLSMetricCard
              label="Median Income"
              value={
                data.medianIncome
                  ? `$${(data.medianIncome.value / 1000).toFixed(1)}K`
                  : 'N/A'
              }
              change={data.medianIncome?.percentChange ?? null}
              icon={DollarSign}
              positiveIsGood={true}
            />

            {/* Unemployment */}
            <BLSMetricCard
              label="Unemployment"
              value={
                data.unemployment
                  ? `${data.unemployment.rate.toFixed(1)}`
                  : 'N/A'
              }
              suffix="%"
              change={data.unemployment?.change ?? null}
              icon={Users}
              positiveIsGood={false}
            />
          </div>
        )}

        {!loading && !error && !data && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-muted animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
