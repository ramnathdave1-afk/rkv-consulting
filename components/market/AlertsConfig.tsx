'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  BellOff,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HeatMapCityMarketData } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AlertThresholds {
  capRateThreshold: number | null
  medianPriceThreshold: number | null
  rentToPriceThreshold: number | null
}

interface AlertsConfigProps {
  trackedMarkets: HeatMapCityMarketData[]
}

/* ------------------------------------------------------------------ */
/*  Alert badge check                                                  */
/* ------------------------------------------------------------------ */

export function checkAlertCriteria(
  market: HeatMapCityMarketData,
  thresholds: AlertThresholds,
  enabled: boolean
): string[] {
  if (!enabled) return []
  const alerts: string[] = []
  const d = market.byType['all']

  // Cap rate check
  if (thresholds.capRateThreshold != null) {
    const capRate = (d.medianRent * 12 * 0.55 / d.medianPrice) * 100
    if (capRate >= thresholds.capRateThreshold) {
      alerts.push(`Cap rate ${capRate.toFixed(1)}% exceeds ${thresholds.capRateThreshold}%`)
    }
  }

  // Median price check
  if (thresholds.medianPriceThreshold != null) {
    if (d.medianPrice <= thresholds.medianPriceThreshold) {
      alerts.push(`Median price $${(d.medianPrice / 1000).toFixed(0)}K below $${(thresholds.medianPriceThreshold / 1000).toFixed(0)}K`)
    }
  }

  // Rent-to-price ratio check
  if (thresholds.rentToPriceThreshold != null) {
    const rtp = (d.medianRent * 12 / d.medianPrice) * 100
    if (rtp >= thresholds.rentToPriceThreshold) {
      alerts.push(`Rent/price ${rtp.toFixed(2)}% exceeds ${thresholds.rentToPriceThreshold}%`)
    }
  }

  return alerts
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AlertsConfig({ trackedMarkets }: AlertsConfigProps) {
  const [enabled, setEnabled] = useState(false)
  const [capRate, setCapRate] = useState<string>('')
  const [medianPrice, setMedianPrice] = useState<string>('')
  const [rentToPrice, setRentToPrice] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build current thresholds
  const thresholds: AlertThresholds = {
    capRateThreshold: capRate ? parseFloat(capRate) : null,
    medianPriceThreshold: medianPrice ? parseFloat(medianPrice) : null,
    rentToPriceThreshold: rentToPrice ? parseFloat(rentToPrice) : null,
  }

  // Check which tracked markets meet alert criteria
  const triggeredMarkets = trackedMarkets
    .map((m) => ({
      market: m,
      alerts: checkAlertCriteria(m, thresholds, enabled),
    }))
    .filter((item) => item.alerts.length > 0)

  // Load saved config on mount
  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/market/alert-config')
      if (res.ok) {
        const json = await res.json()
        if (json.config) {
          setCapRate(json.config.capRateThreshold?.toString() || '')
          setMedianPrice(json.config.medianPriceThreshold?.toString() || '')
          setRentToPrice(json.config.rentToPriceThreshold?.toString() || '')
        }
        setEnabled(json.enabled ?? false)
      }
    } catch {
      // Silently fail — defaults are fine
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Save config
  const saveConfig = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch('/api/market/alert-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholds: {
            capRateThreshold: capRate ? parseFloat(capRate) : null,
            medianPriceThreshold: medianPrice ? parseFloat(medianPrice) : null,
            rentToPriceThreshold: rentToPrice ? parseFloat(rentToPrice) : null,
          },
          enabled,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
        <div className="h-[2px] bg-gradient-to-r from-[#F59E0B]/0 via-[#F59E0B]/60 to-[#F59E0B]/0" />
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-4 w-40 bg-[#1e1e1e] rounded animate-pulse" />
          </div>
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#1e1e1e] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
      {/* Accent top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#F59E0B]/0 via-[#F59E0B]/60 to-[#F59E0B]/0" />

      <div className="p-5">
        {/* Header with enable/disable toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[#F59E0B]" />
            <h3 className="label text-gold">
              ALERT CONFIGURATION //
            </h3>
          </div>

          {/* Toggle switch */}
          <button
            onClick={() => setEnabled(!enabled)}
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold font-mono uppercase tracking-wider transition-all border',
              enabled
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-transparent border-border text-muted'
            )}
          >
            {enabled ? (
              <>
                <Bell className="h-3 w-3" />
                Enabled
              </>
            ) : (
              <>
                <BellOff className="h-3 w-3" />
                Disabled
              </>
            )}
          </button>
        </div>

        {/* Threshold Inputs */}
        <div className="space-y-3 mb-5">
          {/* Cap Rate */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-muted font-mono flex-shrink-0 w-[200px]">
              Alert when cap rate exceeds
            </label>
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={capRate}
                onChange={(e) => setCapRate(e.target.value)}
                disabled={!enabled}
                placeholder="e.g. 7.0"
                className={cn(
                  'w-full h-9 rounded-lg px-3 pr-8 text-sm font-mono text-white placeholder:text-muted-deep focus:outline-none transition-all',
                  enabled
                    ? 'bg-[#080808] border border-border focus:border-gold/50'
                    : 'bg-[#080808]/50 border border-border/50 text-muted cursor-not-allowed'
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">%</span>
            </div>
          </div>

          {/* Median Price */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-muted font-mono flex-shrink-0 w-[200px]">
              Alert when price drops below
            </label>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">$</span>
              <input
                type="number"
                step="10000"
                min="0"
                value={medianPrice}
                onChange={(e) => setMedianPrice(e.target.value)}
                disabled={!enabled}
                placeholder="e.g. 400000"
                className={cn(
                  'w-full h-9 rounded-lg pl-7 pr-3 text-sm font-mono text-white placeholder:text-muted-deep focus:outline-none transition-all',
                  enabled
                    ? 'bg-[#080808] border border-border focus:border-gold/50'
                    : 'bg-[#080808]/50 border border-border/50 text-muted cursor-not-allowed'
                )}
              />
            </div>
          </div>

          {/* Rent-to-Price Ratio */}
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-muted font-mono flex-shrink-0 w-[200px]">
              Alert when rent/price exceeds
            </label>
            <div className="relative flex-1">
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={rentToPrice}
                onChange={(e) => setRentToPrice(e.target.value)}
                disabled={!enabled}
                placeholder="e.g. 0.80"
                className={cn(
                  'w-full h-9 rounded-lg px-3 pr-8 text-sm font-mono text-white placeholder:text-muted-deep focus:outline-none transition-all',
                  enabled
                    ? 'bg-[#080808] border border-border focus:border-gold/50'
                    : 'bg-[#080808]/50 border border-border/50 text-muted cursor-not-allowed'
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">%</span>
            </div>
          </div>
        </div>

        {/* Save button and status */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={saveConfig}
            disabled={saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-body uppercase tracking-wider transition-all border',
              saving
                ? 'bg-gold/5 border-gold/20 text-muted cursor-wait'
                : 'bg-gold/10 border-gold/30 text-gold hover:bg-gold/20 hover:border-gold/50'
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Configuration'}
          </button>

          {error && (
            <span className="text-[10px] text-red font-mono">{error}</span>
          )}
        </div>

        {/* Triggered Markets */}
        {enabled && triggeredMarkets.length > 0 && (
          <div>
            <h4 className="label text-muted mb-2.5" style={{ fontSize: '10px' }}>
              MARKETS MEETING CRITERIA ({triggeredMarkets.length})
            </h4>
            <div className="space-y-2">
              {triggeredMarkets.map((item) => (
                <div
                  key={item.market.id}
                  className="flex items-start gap-3 rounded-lg p-3 border-l-2 border-l-[#F59E0B]"
                  style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderLeft: '2px solid #F59E0B' }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white font-display">
                      {item.market.name}, {item.market.state}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {item.alerts.map((alert, idx) => (
                        <p key={idx} className="text-[10px] text-muted font-mono">
                          {alert}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {enabled && triggeredMarkets.length === 0 && (capRate || medianPrice || rentToPrice) && (
          <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
            <Check className="h-3.5 w-3.5 text-green flex-shrink-0" />
            <span className="text-[10px] text-muted font-mono">
              No tracked markets currently meet your alert criteria
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
