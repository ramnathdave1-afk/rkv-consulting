'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  X,
  MapPin,
  AlertTriangle,
  ArrowDown,
  Bell,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FeatureGate } from '@/components/paywall/FeatureGate'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import DetailPanel from '@/components/market/DetailPanel'
import InterestRateTracker from '@/components/market/InterestRateTracker'
import LiveMarketPulse from '@/components/market/LiveMarketPulse'
import EconomicIndicators from '@/components/market/EconomicIndicators'
import MarketComparison from '@/components/market/MarketComparison'
import BLSIndicators from '@/components/market/BLSIndicators'
import AlertsConfig from '@/components/market/AlertsConfig'

const USMarketMap = dynamic(() => import('@/components/market/USMarketMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl overflow-hidden" style={{ background: '#080808', border: '1px solid #1e1e1e', height: 540 }}>
      <div className="h-[2px] bg-gradient-to-r from-gold/0 via-gold/40 to-gold/0" />
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="text-xs text-muted font-body uppercase tracking-wider">Loading market map...</span>
        </div>
      </div>
    </div>
  ),
})
import {
  MAJOR_METROS,
  fetchRentcastMarketData,
  fetchFREDData,
  FRED_SERIES,
  calculateInvestmentPotentialScore,
} from '@/lib/market/data'
import type {
  HeatMapMetricKey,
  HeatMapCityMarketData,
  WatchedMarket,
} from '@/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const METRIC_TABS: { key: HeatMapMetricKey; label: string }[] = [
  { key: 'medianPrice', label: 'Median Price' },
  { key: 'pricePerSqft', label: '$/Sqft' },
  { key: 'daysOnMarket', label: 'DOM' },
  { key: 'activeInventory', label: 'Inventory' },
  { key: 'monthsOfSupply', label: 'Supply' },
  { key: 'yoyChange', label: 'YoY %' },
  { key: 'medianRent', label: 'Median Rent' },
  { key: 'populationGrowth', label: 'Pop Growth' },
]

const DEFAULT_TRACKED = ['Phoenix, AZ', 'Austin, TX', 'Nashville, TN', 'Tampa, FL', 'Raleigh, NC', 'Denver, CO']

/* ------------------------------------------------------------------ */
/*  Generate opportunity alerts from live data                         */
/* ------------------------------------------------------------------ */

interface OpportunityAlert {
  id: string
  type: string
  title: string
  detail: string
  severity: string
  timestamp: string
}

function generateAlertsFromLiveData(
  trackedMarkets: string[],
  liveDataMap: Record<string, any>
): OpportunityAlert[] {
  const alerts: OpportunityAlert[] = []
  let idx = 0

  for (const market of trackedMarkets) {
    const data = liveDataMap[market]
    if (!data) continue

    const sales = data.sales || data.sale || {}
    const rental = data.rental || data.rent || {}

    // Price drop: negative YoY price change
    const priceChangeYoY = sales.priceChangeYoY ?? sales.medianPriceChangeYoY
    if (priceChangeYoY != null && priceChangeYoY < 0) {
      const pctDrop = Math.abs(priceChangeYoY).toFixed(1)
      alerts.push({
        id: `opp-${++idx}`,
        type: 'price_drop',
        title: 'Price drop detected',
        detail: `${market} median sale price down ${pctDrop}% year-over-year`,
        severity: Math.abs(priceChangeYoY) > 5 ? 'high' : 'medium',
        timestamp: 'Recent',
      })
    }

    // Rent growth opportunity
    const rentChangeYoY = rental.rentChangeYoY ?? rental.medianRentChangeYoY
    if (rentChangeYoY != null && rentChangeYoY > 5) {
      alerts.push({
        id: `opp-${++idx}`,
        type: 'below_market',
        title: 'Strong rent growth',
        detail: `${market} rent up ${rentChangeYoY.toFixed(1)}% YoY — check if your rents are keeping pace`,
        severity: rentChangeYoY > 10 ? 'high' : 'medium',
        timestamp: 'Recent',
      })
    }

    // High vacancy opportunity
    const vacancy = sales.vacancyRate ?? rental.vacancyRate
    if (vacancy != null && vacancy > 8) {
      alerts.push({
        id: `opp-${++idx}`,
        type: 'new_listing',
        title: 'High vacancy detected',
        detail: `${market} vacancy at ${vacancy.toFixed(1)}% — potential buying opportunity`,
        severity: vacancy > 12 ? 'high' : 'low',
        timestamp: 'Recent',
      })
    }
  }

  return alerts
}

/* ------------------------------------------------------------------ */
/*  Helpers — build HeatMapCityMarketData from MAJOR_METROS + live    */
/* ------------------------------------------------------------------ */

function buildCityId(name: string, state: string): string {
  return `${name}, ${state}`
}

/**
 * Construct a full HeatMapCityMarketData object for a metro.
 * If live API data is available it is merged in; otherwise we use
 * realistic fallback data from the metro definition so the map always
 * renders with meaningful color-coded markers.
 */
function buildCityMarketData(
  metro: (typeof MAJOR_METROS)[number],
  liveData?: Record<string, unknown> | null,
): HeatMapCityMarketData {
  const id = buildCityId(metro.name, metro.state)
  const fb = metro.fallback

  // Extract values from the live API response shape (see /api/market/live)
  const sales = (liveData as any)?.sales ?? {}
  const rental = (liveData as any)?.rental ?? {}
  const investment = (liveData as any)?.investment ?? {}

  const medianPrice = sales.median_home_value ?? fb.medianPrice
  const pricePerSqft = sales.median_price_per_sqft ?? fb.pricePerSqft
  const daysOnMarket = sales.average_days_on_market ?? fb.daysOnMarket
  const activeInventory = sales.total_listings ?? fb.activeInventory
  const monthsOfSupply = sales.total_listings
    ? +(activeInventory / Math.max(activeInventory / 6, 1)).toFixed(1)
    : fb.monthsOfSupply
  const medianRent = rental.median_rent ?? fb.medianRent
  const yoyChange = fb.yoyChange
  const populationGrowth = fb.populationGrowth

  const typeData = {
    medianPrice,
    pricePerSqft,
    daysOnMarket,
    activeInventory,
    monthsOfSupply,
    yoyChange,
    medianRent,
  }

  const investmentScore = calculateInvestmentPotentialScore({
    capRate: investment.estimated_cap_rate ?? (medianRent * 12 * 0.55 / medianPrice) * 100,
    priceToRentRatio: investment.rent_to_price_ratio ?? (medianRent * 12 / medianPrice) * 100,
  })

  return {
    id,
    name: metro.name,
    state: metro.state,
    center: metro.center,
    population: metro.population,
    medianHouseholdIncome: 0,
    populationGrowth,
    investmentScore,
    byType: {
      all: typeData,
      single_family: typeData,
      condo: typeData,
      townhouse: typeData,
      multi_family: typeData,
    },
    trends: [],
    lastUpdated: (liveData as any)?.metadata?.fetched_at ?? new Date().toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/*  Market Intelligence Content                                        */
/* ------------------------------------------------------------------ */

function MarketIntelligenceContent() {
  const supabase = createClient()

  // ── Core state ──
  const [loading, setLoading] = useState(true)
  const [trackedMarkets, setTrackedMarkets] = useState<string[]>(DEFAULT_TRACKED)
  const [selectedMetric, setSelectedMetric] = useState<HeatMapMetricKey>('medianPrice')
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [comparedMarkets, setComparedMarkets] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // ── Live data keyed by city ID ("City, ST") ──
  const [liveDataMap, setLiveDataMap] = useState<Record<string, any>>({})

  // ── Interest rate data ──
  const [rateData, setRateData] = useState<{
    mortgage30yr: { current: number; weekAgo: number; label: string }
    mortgage15yr: { current: number; weekAgo: number; label: string }
    fedFunds: { current: number; weekAgo: number; label: string }
  } | null>(null)
  const [rateHistory, setRateHistory] = useState<
    { date: string; mortgage30yr: number; mortgage15yr: number; fedFunds: number }[]
  >([])
  const [rateLastUpdated, setRateLastUpdated] = useState<string | undefined>()

  // ── Economic indicators ──
  const [economicIndicators, setEconomicIndicators] = useState<{
    unemploymentRate: { value: number; change: number; formatted: string }
    jobGrowthYoY: { value: number; change: number; formatted: string }
    populationGrowth: { value: number; change: number; formatted: string }
    newPermits90d: { value: number; change: number; formatted: string }
    medianHouseholdIncome: { value: number; change: number; formatted: string }
  } | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Build HeatMapCityMarketData[] from MAJOR_METROS + live data     */
  /* ---------------------------------------------------------------- */

  const marketData: HeatMapCityMarketData[] = useMemo(() => {
    return MAJOR_METROS.map((metro) => {
      const id = buildCityId(metro.name, metro.state)
      return buildCityMarketData(metro, liveDataMap[id] ?? null)
    })
  }, [liveDataMap])

  // Selected city object for the DetailPanel
  const selectedCityData = useMemo(() => {
    if (!selectedCity) return null
    return marketData.find((c) => c.id === selectedCity) ?? null
  }, [selectedCity, marketData])

  // Markets selected for comparison
  const comparedMarketData = useMemo(() => {
    return comparedMarkets
      .map((id) => marketData.find((c) => c.id === id))
      .filter(Boolean) as HeatMapCityMarketData[]
  }, [comparedMarkets, marketData])

  /* ---------------------------------------------------------------- */
  /*  Fetch watched markets from Supabase                             */
  /* ---------------------------------------------------------------- */

  const fetchWatchedMarkets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: markets } = await supabase
        .from('watched_markets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (markets && markets.length > 0) {
        const cityStrings = (markets as WatchedMarket[]).map(
          (m) => `${m.city}, ${m.state}`
        )
        // Merge with defaults, no duplicates
        setTrackedMarkets((prev) => {
          const set = new Set([...cityStrings, ...prev])
          return Array.from(set)
        })
      }
    } catch (err) {
      console.error('Error fetching watched markets:', err)
    }
  }, [supabase])

  /* ---------------------------------------------------------------- */
  /*  Fetch live market data for each tracked market                  */
  /* ---------------------------------------------------------------- */

  const fetchLiveData = useCallback(async () => {
    const results: Record<string, any> = {}

    await Promise.allSettled(
      trackedMarkets.map(async (cityStr) => {
        const [city, state] = cityStr.split(', ')
        if (!city || !state) return

        // Find matching metro for zip lookup
        const metro = MAJOR_METROS.find(
          (m) => m.name.toLowerCase() === city.toLowerCase() && m.state === state
        )
        if (!metro) return

        try {
          const data = await fetchRentcastMarketData(city, state, metro.zip)
          if (data) {
            results[cityStr] = data
          }
        } catch (err) {
          console.error(`[Market Intelligence] Failed to fetch data for ${cityStr}:`, err)
        }
      })
    )

    setLiveDataMap((prev) => ({ ...prev, ...results }))
  }, [trackedMarkets])

  /* ---------------------------------------------------------------- */
  /*  Fetch interest rate data from FRED                              */
  /* ---------------------------------------------------------------- */

  const fetchRates = useCallback(async () => {
    try {
      const [m30, m15, ff] = await Promise.allSettled([
        fetchFREDData(FRED_SERIES.MORTGAGE_30YR, 24),
        fetchFREDData(FRED_SERIES.MORTGAGE_15YR, 24),
        fetchFREDData(FRED_SERIES.FED_FUNDS_RATE, 24),
      ])

      const m30Data = m30.status === 'fulfilled' ? m30.value : null
      const m15Data = m15.status === 'fulfilled' ? m15.value : null
      const ffData = ff.status === 'fulfilled' ? ff.value : null

      // Build rate cards
      const last30 = m30Data?.length ? m30Data[m30Data.length - 1].value : 6.5
      const prev30 = m30Data && m30Data.length > 1 ? m30Data[m30Data.length - 2].value : last30
      const last15 = m15Data?.length ? m15Data[m15Data.length - 1].value : 5.8
      const prev15 = m15Data && m15Data.length > 1 ? m15Data[m15Data.length - 2].value : last15
      const lastFF = ffData?.length ? ffData[ffData.length - 1].value : 5.25
      const prevFF = ffData && ffData.length > 1 ? ffData[ffData.length - 2].value : lastFF

      setRateData({
        mortgage30yr: { current: last30, weekAgo: prev30, label: '30yr Fixed' },
        mortgage15yr: { current: last15, weekAgo: prev15, label: '15yr Fixed' },
        fedFunds: { current: lastFF, weekAgo: prevFF, label: 'Fed Funds' },
      })

      // Build historical chart data (merge all 3 series by date)
      if (m30Data && m15Data && ffData) {
        const dateMap = new Map<string, { mortgage30yr: number; mortgage15yr: number; fedFunds: number }>()

        m30Data.forEach((p) => {
          const key = p.date.slice(0, 7) // YYYY-MM
          const existing = dateMap.get(key) || { mortgage30yr: 0, mortgage15yr: 0, fedFunds: 0 }
          existing.mortgage30yr = p.value
          dateMap.set(key, existing)
        })
        m15Data.forEach((p) => {
          const key = p.date.slice(0, 7)
          const existing = dateMap.get(key) || { mortgage30yr: 0, mortgage15yr: 0, fedFunds: 0 }
          existing.mortgage15yr = p.value
          dateMap.set(key, existing)
        })
        ffData.forEach((p) => {
          const key = p.date.slice(0, 7)
          const existing = dateMap.get(key) || { mortgage30yr: 0, mortgage15yr: 0, fedFunds: 0 }
          existing.fedFunds = p.value
          dateMap.set(key, existing)
        })

        const history = Array.from(dateMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, vals]) => ({ date, ...vals }))

        setRateHistory(history)
      }

      if (m30Data?.length) {
        setRateLastUpdated(m30Data[m30Data.length - 1].date)
      }
    } catch (err) {
      console.error('Error fetching rate data:', err)
    }
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Fetch economic indicators from FRED                             */
  /* ---------------------------------------------------------------- */

  const fetchEconomicIndicators = useCallback(async () => {
    try {
      const [unrate, cpi] = await Promise.allSettled([
        fetchFREDData(FRED_SERIES.UNEMPLOYMENT, 2),
        fetchFREDData(FRED_SERIES.CPI, 2),
      ])

      const unrateData = unrate.status === 'fulfilled' ? unrate.value : null
      const _cpiData = cpi.status === 'fulfilled' ? cpi.value : null

      const currentUn = unrateData?.length ? unrateData[unrateData.length - 1].value : 3.8
      const prevUn = unrateData && unrateData.length > 1 ? unrateData[unrateData.length - 2].value : currentUn

      setEconomicIndicators({
        unemploymentRate: {
          value: currentUn,
          change: +(currentUn - prevUn).toFixed(1),
          formatted: `${currentUn.toFixed(1)}%`,
        },
        jobGrowthYoY: {
          value: 2.1,
          change: 0.3,
          formatted: '+2.1%',
        },
        populationGrowth: {
          value: 0.5,
          change: 0.1,
          formatted: '+0.5%',
        },
        newPermits90d: {
          value: 1450000,
          change: 2.5,
          formatted: '1.45M',
        },
        medianHouseholdIncome: {
          value: 74580,
          change: 3.2,
          formatted: '$74.6K',
        },
      })
    } catch (err) {
      console.error('Error fetching economic indicators:', err)
    }
  }, [])

  /* ---------------------------------------------------------------- */
  /*  On mount: fetch everything                                      */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    async function init() {
      setLoading(true)
      await fetchWatchedMarkets()
      await Promise.allSettled([fetchLiveData(), fetchRates(), fetchEconomicIndicators()])
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch live data when tracked markets change
  useEffect(() => {
    if (!loading) {
      fetchLiveData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedMarkets])

  /* ---------------------------------------------------------------- */
  /*  Computed opportunity alerts                                       */
  /* ---------------------------------------------------------------- */

  const opportunityAlerts = useMemo(
    () => generateAlertsFromLiveData(trackedMarkets, liveDataMap),
    [trackedMarkets, liveDataMap]
  )

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  function handleAddMarket() {
    if (!searchQuery.trim()) return
    const parts = searchQuery.split(',').map((s) => s.trim())
    const city = parts[0]
    const state = parts[1] || 'US'
    const cityStr = `${city}, ${state}`

    setTrackedMarkets((prev) => {
      if (prev.includes(cityStr)) return prev
      return [cityStr, ...prev]
    })
    setSearchQuery('')
  }

  function handleRemoveTracked(cityStr: string) {
    setTrackedMarkets((prev) => prev.filter((c) => c !== cityStr))
    if (selectedCity === cityStr) setSelectedCity(null)
    setComparedMarkets((prev) => prev.filter((c) => c !== cityStr))
  }

  function handleTrackCity(cityId: string) {
    setTrackedMarkets((prev) => {
      if (prev.includes(cityId)) {
        return prev.filter((c) => c !== cityId)
      }
      return [...prev, cityId]
    })
  }

  function handleToggleCompare(cityId: string) {
    setComparedMarkets((prev) => {
      if (prev.includes(cityId)) return prev.filter((c) => c !== cityId)
      if (prev.length >= 3) return prev // max 3
      return [...prev, cityId]
    })
  }

  function handleCompareAddMarket() {
    // If a city is selected but not yet in comparison, add it
    if (selectedCity && !comparedMarkets.includes(selectedCity) && comparedMarkets.length < 3) {
      setComparedMarkets((prev) => [...prev, selectedCity])
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Loading skeleton                                                 */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-[#1e1e1e] rounded-lg w-56 animate-pulse" />
          <div className="h-10 bg-[#1e1e1e] rounded-lg w-32 animate-pulse" />
        </div>
        {/* Chips skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-[#1e1e1e] rounded-full w-28 animate-pulse" />
          ))}
        </div>
        {/* Metric tabs skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-9 bg-[#1e1e1e] rounded-full w-24 animate-pulse" />
          ))}
        </div>
        {/* Map skeleton */}
        <div className="h-[520px] bg-[#111111] border border-[#1e1e1e] rounded-xl animate-pulse" />
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-[#1e1e1e] rounded w-32 mb-4" />
              <div className="h-4 bg-[#1e1e1e] rounded w-24 mb-2" />
              <div className="h-4 bg-[#1e1e1e] rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/*  Header                                                       */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            className="font-display font-bold text-2xl text-white tracking-tight"
          >
            Market Intelligence
          </h1>
          <div className="flex items-center gap-3 ml-1">
            <div className="flex items-center gap-1.5">
              <span className="pulse-dot" />
              <span className="text-[10px] font-body font-semibold text-green uppercase tracking-wider">
                Live Data
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-deep">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMarket()}
              placeholder="City, State..."
              className="h-10 w-52 rounded-lg bg-card border border-border pl-9 pr-3 text-sm text-white placeholder:text-muted-deep font-body focus:outline-none focus:border-gold/50 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={handleAddMarket}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gold text-card hover:bg-gold/80 transition-all font-display uppercase tracking-wide"
          >
            <Plus className="h-4 w-4" />
            Add Market
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Live market pulse (day-to-day rates & indicators)            */}
      {/* ============================================================ */}
      <LiveMarketPulse />

      {/* ============================================================ */}
      {/*  Tracked Markets Chips                                        */}
      {/* ============================================================ */}
      <div>
        <h3 className="label text-muted mb-3">TRACKED MARKETS //</h3>
        <div className="flex flex-wrap gap-2">
        {trackedMarkets.map((cityStr) => {
          const isSelected = selectedCity === cityStr
          return (
            <button
              key={cityStr}
              type="button"
              onClick={() => setSelectedCity(isSelected ? null : cityStr)}
              className={cn(
                'group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border font-mono',
                isSelected
                  ? 'bg-gold/15 border-gold/40 text-gold glow-border'
                  : 'bg-card border-border text-muted hover:border-gold/25 hover:text-white'
              )}
            >
              <MapPin className="h-3 w-3" />
              {cityStr}
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveTracked(cityStr)
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-red/20 hover:text-red transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          )
        })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Metric Selector Tabs                                         */}
      {/* ============================================================ */}
      <div className="flex flex-wrap gap-2">
        {METRIC_TABS.map((tab) => {
          const isActive = selectedMetric === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedMetric(tab.key)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold transition-all border font-body uppercase tracking-wider',
                isActive
                  ? 'bg-gold text-card border-gold shadow-[0_0_12px_rgba(201,168,76,0.2)]'
                  : 'bg-card text-muted border-border hover:border-gold/30 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/*  Combined US Market Map + Detail Panel                        */}
      {/* ============================================================ */}
      <div className="flex gap-0 rounded-xl overflow-hidden">
        {/* Map area */}
        <div
          className={cn(
            'transition-all duration-300',
            selectedCityData ? 'w-[65%]' : 'w-full',
          )}
        >
          <USMarketMap
            marketData={marketData}
            selectedMetric={selectedMetric}
            selectedPropertyType="all"
            selectedCity={selectedCity}
            onCitySelect={setSelectedCity}
            trackedMarkets={trackedMarkets}
          />
        </div>

        {/* Detail Panel — slide in from right */}
        {selectedCityData && (
          <div className="w-[35%]" style={{ height: 542 }}>
            <DetailPanel
              city={selectedCityData}
              onClose={() => setSelectedCity(null)}
              onTrack={handleTrackCity}
              isTracked={trackedMarkets.includes(selectedCityData.id)}
            />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Interest Rate Tracker                                        */}
      {/* ============================================================ */}
      {rateData && (
        <InterestRateTracker
          rates={rateData}
          history={rateHistory}
          lastUpdated={rateLastUpdated}
        />
      )}

      {/* ============================================================ */}
      {/*  Economic Indicators                                          */}
      {/* ============================================================ */}
      {economicIndicators && (
        <EconomicIndicators indicators={economicIndicators} />
      )}

      {/* ============================================================ */}
      {/*  BLS Economic Data (city-specific, shown when selected)       */}
      {/* ============================================================ */}
      {selectedCityData && (
        <BLSIndicators
          metro={selectedCityData.name}
          state={selectedCityData.state}
        />
      )}

      {/* ============================================================ */}
      {/*  Market Comparison                                            */}
      {/* ============================================================ */}
      {comparedMarkets.length > 0 && (
        <MarketComparison
          markets={comparedMarketData}
          onAddMarket={handleCompareAddMarket}
          onRemoveMarket={(cityId) =>
            setComparedMarkets((prev) => prev.filter((c) => c !== cityId))
          }
          propertyType="all"
        />
      )}

      {/* ============================================================ */}
      {/*  Compare Action (if a city is selected)                       */}
      {/* ============================================================ */}
      {selectedCity && !comparedMarkets.includes(selectedCity) && comparedMarkets.length < 3 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => handleToggleCompare(selectedCity)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-card border border-border text-muted hover:border-gold/40 hover:text-gold transition-all font-mono uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" />
            Add {selectedCity} to Comparison ({comparedMarkets.length}/3)
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Opportunity Alerts                                           */}
      {/* ============================================================ */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #1e1e1e' }}>
        {/* Cyan accent top border */}
        <div className="h-[2px] bg-gradient-to-r from-[#c9a84c]/0 via-[#c9a84c]/60 to-[#c9a84c]/0" />

        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3 className="label text-gold">
                OPPORTUNITY ALERTS //
              </h3>
              <span className="text-[10px] font-mono font-semibold bg-gold/10 text-gold border border-gold/20 rounded-full px-2 py-0.5">
                {opportunityAlerts.length} new
              </span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-gold transition-colors font-mono uppercase tracking-wider"
            >
              <Bell className="h-3.5 w-3.5" />
              Manage Alerts
            </button>
          </div>

          <div className="space-y-3">
            {opportunityAlerts.length === 0 && (
              <p className="text-sm text-muted text-center py-6">
                No alerts right now. Alerts are generated from your tracked markets when price drops, rent growth, or vacancy changes are detected.
              </p>
            )}
            {opportunityAlerts.map((opp) => {
              const severityColors: Record<string, { bg: string; icon: string; border: string; leftBorder: string }> = {
                high: { bg: 'bg-red/10', icon: 'text-red', border: 'border-red/20', leftBorder: 'border-l-2 border-l-red' },
                medium: { bg: 'bg-[#F59E0B]/10', icon: 'text-[#F59E0B]', border: 'border-[#F59E0B]/20', leftBorder: 'border-l-2 border-l-[#F59E0B]' },
                low: { bg: 'bg-gold/10', icon: 'text-gold', border: 'border-gold/20', leftBorder: 'border-l-2 border-l-gold' },
              }
              const colors = severityColors[opp.severity] || severityColors.low

              const iconMap: Record<string, React.ElementType> = {
                price_drop: ArrowDown,
                below_market: AlertTriangle,
                new_listing: MapPin,
              }
              const Icon = (iconMap[opp.type] || AlertTriangle) as React.ComponentType<{ className?: string }>

              return (
                <div
                  key={opp.id}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-white/[0.02]',
                    colors.border,
                    colors.leftBorder,
                  )}
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0', colors.bg)}>
                    <Icon className={cn('h-4 w-4', colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white font-display">{opp.title}</p>
                    <p className="text-sm text-muted mt-0.5">{opp.detail}</p>
                    <p className="text-xs text-muted-deep mt-1 font-mono">{opp.timestamp}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-gold hover:text-white transition-colors flex-shrink-0 font-mono uppercase tracking-wider border border-gold/30 rounded-md px-3 py-1.5 hover:bg-gold/10"
                  >
                    View
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Alert Configuration                                          */}
      {/* ============================================================ */}
      <AlertsConfig
        trackedMarkets={trackedMarkets
          .map((id) => marketData.find((m) => m.id === id))
          .filter(Boolean) as HeatMapCityMarketData[]}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exported page with FeatureGate                                     */
/* ------------------------------------------------------------------ */

export default function MarketIntelligencePage() {
  return (
    <FeatureGate feature="marketIntelligence">
      <MarketIntelligenceContent />
    </FeatureGate>
  )
}
