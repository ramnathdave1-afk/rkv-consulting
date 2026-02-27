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
import MapWrapper from '@/components/market/MapWrapper'
import DetailPanel from '@/components/market/DetailPanel'
import InterestRateTracker from '@/components/market/InterestRateTracker'
import EconomicIndicators from '@/components/market/EconomicIndicators'
import MarketComparison from '@/components/market/MarketComparison'
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
/*  Opportunity Alerts Data                                            */
/* ------------------------------------------------------------------ */

const OPPORTUNITY_ALERTS = [
  {
    id: 'opp-1',
    type: 'price_drop',
    title: 'Price drop detected',
    detail: '1234 Oak St, Phoenix, AZ reduced by 12% ($45,000)',
    severity: 'high',
    timestamp: '2 hours ago',
  },
  {
    id: 'opp-2',
    type: 'below_market',
    title: 'Below market rent',
    detail: '85281 zip avg rent up 8%, your property at 4567 Maple Ave unchanged',
    severity: 'medium',
    timestamp: '6 hours ago',
  },
  {
    id: 'opp-3',
    type: 'new_listing',
    title: 'New listing matches criteria',
    detail: '789 Pine Dr, Austin, TX - 3bd/2ba, $325,000 - Cap rate est. 7.2%',
    severity: 'low',
    timestamp: '1 day ago',
  },
  {
    id: 'opp-4',
    type: 'price_drop',
    title: 'Price drop detected',
    detail: '5678 Elm Blvd, Nashville, TN reduced by 8% ($28,000)',
    severity: 'medium',
    timestamp: '1 day ago',
  },
  {
    id: 'opp-5',
    type: 'new_listing',
    title: 'New listing matches criteria',
    detail: '321 Cedar Ln, Tampa, FL - 4bd/3ba, $410,000 - Cap rate est. 6.8%',
    severity: 'low',
    timestamp: '2 days ago',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers — build HeatMapCityMarketData from MAJOR_METROS + live    */
/* ------------------------------------------------------------------ */

function buildCityId(name: string, state: string): string {
  return `${name}, ${state}`
}

/**
 * Construct a full HeatMapCityMarketData object for a metro.
 * If live API data is available it is merged in; otherwise we use the
 * metro population as the only real value and zeros for metrics
 * (the map will still render the bubble).
 */
function buildCityMarketData(
  metro: (typeof MAJOR_METROS)[number],
  liveData?: Record<string, unknown> | null,
): HeatMapCityMarketData {
  const id = buildCityId(metro.name, metro.state)

  // Extract values from the live API response shape (see /api/market/live)
  const sales = (liveData as any)?.sales ?? {}
  const rental = (liveData as any)?.rental ?? {}
  const investment = (liveData as any)?.investment ?? {}

  const medianPrice = sales.median_home_value ?? 0
  const pricePerSqft = sales.median_price_per_sqft ?? 0
  const daysOnMarket = sales.average_days_on_market ?? 0
  const activeInventory = sales.total_listings ?? 0
  // Rough months of supply: inventory / (sold_last_30 or inventory/6)
  const monthsOfSupply = activeInventory > 0 ? +(activeInventory / Math.max(activeInventory / 6, 1)).toFixed(1) : 0
  const medianRent = rental.median_rent ?? 0
  const yoyChange = 0 // live API doesn't return YoY yet
  const populationGrowth = 0 // census data not in live API

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
    capRate: investment.estimated_cap_rate ?? undefined,
    priceToRentRatio: investment.rent_to_price_ratio ?? undefined,
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

        // Find matching metro for zip lookup (if any)
        const metro = MAJOR_METROS.find(
          (m) => m.name.toLowerCase() === city.toLowerCase() && m.state === state
        )
        if (!metro) return

        try {
          const data = await fetchRentcastMarketData(city, state)
          if (data) {
            results[cityStr] = data
          }
        } catch {
          // silently skip failed fetches
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
          <div className="h-8 bg-[#1E2530] rounded-lg w-56 animate-pulse" />
          <div className="h-10 bg-[#1E2530] rounded-lg w-32 animate-pulse" />
        </div>
        {/* Chips skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-[#1E2530] rounded-full w-28 animate-pulse" />
          ))}
        </div>
        {/* Metric tabs skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-9 bg-[#1E2530] rounded-full w-24 animate-pulse" />
          ))}
        </div>
        {/* Map skeleton */}
        <div className="h-[520px] bg-[#111620] border border-[#1E2530] rounded-xl animate-pulse" />
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#111620] border border-[#1E2530] rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-[#1E2530] rounded w-32 mb-4" />
              <div className="h-4 bg-[#1E2530] rounded w-24 mb-2" />
              <div className="h-4 bg-[#1E2530] rounded w-20" />
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
            className="font-bold text-2xl text-white tracking-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Market Intelligence
          </h1>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="text-[10px] font-semibold text-[#22c55e] uppercase tracking-wider font-sans">
              Live
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8891a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMarket()}
              placeholder="City, State..."
              className="h-10 w-52 rounded-lg bg-[#111620] border border-[#1E2530] pl-9 pr-3 text-sm text-white placeholder:text-[#555] focus:outline-none focus:border-[#C9A84C]/50 transition-colors font-sans"
            />
          </div>
          <button
            type="button"
            onClick={handleAddMarket}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#C9A84C] text-[#080A0E] hover:bg-[#d4b45c] transition-all"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            <Plus className="h-4 w-4" />
            Add Market
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Tracked Markets Chips                                        */}
      {/* ============================================================ */}
      <div className="flex flex-wrap gap-2">
        {trackedMarkets.map((cityStr) => {
          const isSelected = selectedCity === cityStr
          return (
            <button
              key={cityStr}
              type="button"
              onClick={() => setSelectedCity(isSelected ? null : cityStr)}
              className={cn(
                'group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all border font-sans',
                isSelected
                  ? 'bg-[#C9A84C]/15 border-[#C9A84C]/40 text-[#C9A84C]'
                  : 'bg-[#111620] border-[#1E2530] text-[#8891a0] hover:border-[#C9A84C]/25 hover:text-white'
              )}
            >
              <MapPin className="h-3 w-3" />
              {cityStr}
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveTracked(cityStr)
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </button>
          )
        })}
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
                'rounded-full px-4 py-2 text-xs font-semibold transition-all border font-sans',
                isActive
                  ? 'bg-[#C9A84C] text-[#080A0E] border-[#C9A84C]'
                  : 'bg-[#111620] text-[#8891a0] border-[#1E2530] hover:border-[#C9A84C]/30 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/*  Main Content: Map (65%) + Detail Panel (35%)                 */}
      {/* ============================================================ */}
      <div className="flex gap-0 rounded-xl overflow-hidden border border-[#1E2530]">
        {/* Map area */}
        <div
          className={cn(
            'transition-all duration-300',
            selectedCityData ? 'w-[65%]' : 'w-full',
          )}
          style={{ minHeight: 520 }}
        >
          <MapWrapper
            marketData={marketData}
            selectedMetric={selectedMetric}
            selectedPropertyType="all"
            selectedCity={selectedCity}
            onCitySelect={setSelectedCity}
          />
        </div>

        {/* Detail Panel — slide in from right */}
        {selectedCityData && (
          <div className="w-[35%]" style={{ minHeight: 520 }}>
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#111620] border border-[#1E2530] text-[#8891a0] hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all font-sans"
          >
            <Plus className="h-4 w-4" />
            Add {selectedCity} to Comparison ({comparedMarkets.length}/3)
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Opportunity Alerts                                           */}
      {/* ============================================================ */}
      <div className="rounded-xl bg-[#111620] border border-[#1E2530] overflow-hidden">
        {/* Gold accent top border */}
        <div className="h-[2px] bg-gradient-to-r from-[#C9A84C]/0 via-[#C9A84C]/60 to-[#C9A84C]/0" />

        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h3
                className="text-sm font-bold text-white uppercase tracking-wider"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                Opportunity Alerts
              </h3>
              <span className="text-[10px] font-semibold bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 rounded-full px-2 py-0.5">
                {OPPORTUNITY_ALERTS.length} new
              </span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium text-[#8891a0] hover:text-white transition-colors font-sans"
            >
              <Bell className="h-3.5 w-3.5" />
              Manage Alerts
            </button>
          </div>

          <div className="space-y-3">
            {OPPORTUNITY_ALERTS.map((opp) => {
              const severityColors: Record<string, { bg: string; icon: string; border: string }> = {
                high: { bg: 'bg-[#ef4444]/10', icon: 'text-[#ef4444]', border: 'border-[#ef4444]/20' },
                medium: { bg: 'bg-[#C9A84C]/10', icon: 'text-[#C9A84C]', border: 'border-[#C9A84C]/20' },
                low: { bg: 'bg-[#22c55e]/10', icon: 'text-[#22c55e]', border: 'border-[#22c55e]/20' },
              }
              const colors = severityColors[opp.severity] || severityColors.low

              const iconMap: Record<string, React.ElementType> = {
                price_drop: ArrowDown,
                below_market: AlertTriangle,
                new_listing: MapPin,
              }
              const Icon = iconMap[opp.type] || AlertTriangle

              return (
                <div
                  key={opp.id}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-white/[0.02]',
                    colors.border,
                  )}
                >
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0', colors.bg)}>
                    <Icon className={cn('h-4 w-4', colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white font-sans">{opp.title}</p>
                    <p className="text-sm text-[#8891a0] mt-0.5 font-sans">{opp.detail}</p>
                    <p className="text-xs text-[#555] mt-1 font-sans">{opp.timestamp}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-[#C9A84C] hover:text-[#d4b45c] transition-colors flex-shrink-0 font-sans"
                  >
                    View
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
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
