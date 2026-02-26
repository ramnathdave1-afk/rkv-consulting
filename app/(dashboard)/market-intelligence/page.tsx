'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Search,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  MapPin,
  Users,
  Briefcase,
  Home,
  Clock,
  DollarSign,
  BarChart3,
  AlertTriangle,
  ArrowDown,
  Bell,
  Eye,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { FeatureGate } from '@/components/paywall/FeatureGate'
import { cn } from '@/lib/utils'
import type { WatchedMarket, MarketData } from '@/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '--'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

function generateMockMarketData(city: string, state: string): MarketData {
  const basePrice = 250000 + Math.random() * 400000
  const baseRent = 1200 + Math.random() * 1800
  return {
    city,
    state,
    zip: null,
    county: null,
    median_home_price: Math.round(basePrice),
    median_price_per_sqft: Math.round(150 + Math.random() * 200),
    median_rent: Math.round(baseRent),
    rent_to_price_ratio: parseFloat(((baseRent * 12 / basePrice) * 100).toFixed(2)),
    price_change_yoy: parseFloat((-5 + Math.random() * 15).toFixed(1)),
    average_rent_1br: Math.round(baseRent * 0.7),
    average_rent_2br: Math.round(baseRent),
    average_rent_3br: Math.round(baseRent * 1.35),
    rent_change_yoy: parseFloat((-2 + Math.random() * 10).toFixed(1)),
    active_listings: Math.round(200 + Math.random() * 1500),
    days_on_market: Math.round(15 + Math.random() * 60),
    months_of_supply: parseFloat((1.5 + Math.random() * 5).toFixed(1)),
    sold_last_30_days: Math.round(50 + Math.random() * 400),
    new_listings_last_30_days: Math.round(60 + Math.random() * 500),
    population: Math.round(100000 + Math.random() * 900000),
    population_growth: parseFloat((-1 + Math.random() * 5).toFixed(1)),
    median_household_income: Math.round(50000 + Math.random() * 60000),
    unemployment_rate: parseFloat((3 + Math.random() * 4).toFixed(1)),
    job_growth_rate: parseFloat((-1 + Math.random() * 6).toFixed(1)),
    cap_rate_estimate: parseFloat((4 + Math.random() * 4).toFixed(1)),
    cash_on_cash_estimate: parseFloat((5 + Math.random() * 8).toFixed(1)),
    vacancy_rate: parseFloat((3 + Math.random() * 8).toFixed(1)),
    walkability_score: Math.round(30 + Math.random() * 70),
    crime_index: Math.round(20 + Math.random() * 60),
    school_rating: Math.round(4 + Math.random() * 6),
    data_source: 'RKV Market Intelligence',
    last_updated: new Date().toISOString(),
  }
}

function generateMockWatchedMarkets(): WatchedMarket[] {
  const cities = [
    { city: 'Phoenix', state: 'AZ' },
    { city: 'Austin', state: 'TX' },
    { city: 'Nashville', state: 'TN' },
    { city: 'Tampa', state: 'FL' },
    { city: 'Raleigh', state: 'NC' },
    { city: 'Denver', state: 'CO' },
  ]

  return cities.map((loc, i) => ({
    id: `market-${i}`,
    user_id: '',
    city: loc.city,
    state: loc.state,
    zip: null,
    county: null,
    metrics: generateMockMarketData(loc.city, loc.state),
    last_refreshed: new Date().toISOString(),
    alert_on_change: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

function generateTrendData(baseValue: number, volatility: number, trend: number): { month: string; value: number }[] {
  return MONTHS.map((month, i) => ({
    month,
    value: Math.round(baseValue * (1 + (trend * i / 12) + (Math.random() - 0.5) * volatility)),
  }))
}

function generatePriceDistribution(): { range: string; count: number }[] {
  return [
    { range: '<$200K', count: Math.round(50 + Math.random() * 100) },
    { range: '$200-300K', count: Math.round(100 + Math.random() * 200) },
    { range: '$300-400K', count: Math.round(150 + Math.random() * 250) },
    { range: '$400-500K', count: Math.round(120 + Math.random() * 180) },
    { range: '$500-600K', count: Math.round(80 + Math.random() * 120) },
    { range: '$600-800K', count: Math.round(40 + Math.random() * 80) },
    { range: '$800K-1M', count: Math.round(20 + Math.random() * 40) },
    { range: '>$1M', count: Math.round(10 + Math.random() * 30) },
  ]
}

/* ------------------------------------------------------------------ */
/*  Heat Map Colors                                                    */
/* ------------------------------------------------------------------ */

function getHeatMapColor(value: number): string {
  // Value 0-1, 0 = opportunity (green), 1 = overpriced (red)
  if (value < 0.2) return '#22C55E'
  if (value < 0.4) return '#4ADE80'
  if (value < 0.5) return '#C9A84C'
  if (value < 0.6) return '#E8C97A'
  if (value < 0.75) return '#F97316'
  if (value < 0.9) return '#EF4444'
  return '#DC2626'
}

/* ------------------------------------------------------------------ */
/*  Opportunity Alerts Data                                            */
/* ------------------------------------------------------------------ */

const MOCK_OPPORTUNITIES = [
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
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload, label, prefix = '$' }: { active?: boolean; payload?: Array<{ value: number; color: string }>; label?: string; prefix?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-deep border border-border rounded-lg px-3 py-2 shadow-card">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-semibold text-white">
        {prefix}{payload[0].value.toLocaleString()}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Market Intelligence Content                                        */
/* ------------------------------------------------------------------ */

function MarketIntelligenceContent() {
  const supabase = createClient()

  // Data state
  const [watchedMarkets, setWatchedMarkets] = useState<WatchedMarket[]>([])
  const [loading, setLoading] = useState(true)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMarket, setSelectedMarket] = useState<WatchedMarket | null>(null)

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setWatchedMarkets(generateMockWatchedMarkets())
        setLoading(false)
        return
      }

      const { data: markets } = await supabase
        .from('watched_markets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (markets && markets.length > 0) {
        setWatchedMarkets(markets as WatchedMarket[])
      } else {
        // Use mock data if no watched markets
        setWatchedMarkets(generateMockWatchedMarkets())
      }
    } catch (err) {
      console.error('Market data fetch error:', err)
      setWatchedMarkets(generateMockWatchedMarkets())
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  function handleSearch() {
    if (!searchQuery.trim()) return
    // Mock: add a new watched market from search
    const parts = searchQuery.split(',').map((s) => s.trim())
    const city = parts[0] || searchQuery
    const state = parts[1] || 'US'

    const newMarket: WatchedMarket = {
      id: `market-${Date.now()}`,
      user_id: '',
      city,
      state,
      zip: null,
      county: null,
      metrics: generateMockMarketData(city, state),
      last_refreshed: new Date().toISOString(),
      alert_on_change: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setWatchedMarkets((prev) => [newMarket, ...prev])
    setSelectedMarket(newMarket)
    setSearchQuery('')
  }

  function handleRemoveMarket(id: string) {
    setWatchedMarkets((prev) => prev.filter((m) => m.id !== id))
    if (selectedMarket?.id === id) setSelectedMarket(null)
  }

  /* ---------------------------------------------------------------- */
  /*  Chart data for selected market                                   */
  /* ---------------------------------------------------------------- */

  const homePriceTrend = useMemo(() => {
    if (!selectedMarket?.metrics?.median_home_price) return []
    return generateTrendData(selectedMarket.metrics.median_home_price, 0.05, 0.06)
  }, [selectedMarket])

  const rentTrend = useMemo(() => {
    if (!selectedMarket?.metrics?.median_rent) return []
    return generateTrendData(selectedMarket.metrics.median_rent, 0.04, 0.04)
  }, [selectedMarket])

  const inventoryData = useMemo(() => {
    return MONTHS.map((month) => ({
      month,
      listings: Math.round(200 + Math.random() * 600),
    }))
  }, [selectedMarket])

  const priceDistribution = useMemo(() => {
    return generatePriceDistribution()
  }, [selectedMarket])

  /* ---------------------------------------------------------------- */
  /*  Heat map grid data                                               */
  /* ---------------------------------------------------------------- */

  const heatMapData = useMemo(() => {
    return Array.from({ length: 64 }, () => Math.random())
  }, [selectedMarket])

  /* ---------------------------------------------------------------- */
  /*  Loading skeleton                                                 */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-border rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-border rounded w-32 mb-4" />
              <div className="h-4 bg-border rounded w-24 mb-2" />
              <div className="h-4 bg-border rounded w-20" />
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
        <h1 className="font-display font-bold text-2xl text-white">Market Intelligence</h1>
        <button
          type="button"
          onClick={() => document.getElementById('market-search')?.focus()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gold text-black hover:brightness-110 hover:shadow-glow transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Market
        </button>
      </div>

      {/* ============================================================ */}
      {/*  Search Bar                                                   */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <input
              id="market-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by city, state, or zip code..."
              className="w-full h-12 rounded-lg bg-deep border border-border pl-11 pr-4 text-sm text-white placeholder:text-muted focus:outline-none focus:border-gold/50 transition-colors font-body"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="px-6 h-12 rounded-lg text-sm font-semibold bg-gold text-black hover:brightness-110 hover:shadow-glow transition-all"
          >
            Analyze
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Watched Markets                                              */}
      {/* ============================================================ */}
      <div>
        <h2 className="font-display font-semibold text-lg text-white mb-4">Watched Markets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {watchedMarkets.map((market) => {
            const m = market.metrics
            const isSelected = selectedMarket?.id === market.id
            return (
              <div
                key={market.id}
                className={cn(
                  'bg-card border rounded-xl p-5 cursor-pointer transition-all hover:shadow-card',
                  isSelected ? 'border-gold/50 shadow-glow-sm' : 'border-border hover:border-gold/20',
                )}
                onClick={() => setSelectedMarket(market)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-white">
                      {market.city}, {market.state}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Updated {market.last_refreshed
                        ? new Date(market.last_refreshed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'recently'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveMarket(market.id) }}
                    className="p-1 rounded-lg text-muted hover:text-red hover:bg-red/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Metrics */}
                {m && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Median Home</p>
                      <p className="text-sm font-semibold text-white">{formatCurrency(m.median_home_price || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Median Rent</p>
                      <p className="text-sm font-semibold text-white">
                        ${(m.median_rent || 0).toLocaleString()}/mo
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Price-to-Rent</p>
                      <p className="text-sm font-semibold text-gold">{m.rent_to_price_ratio?.toFixed(1) || '--'}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider">Pop. Growth</p>
                      <div className="flex items-center gap-1">
                        {(m.population_growth || 0) >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red" />
                        )}
                        <p className={cn(
                          'text-sm font-semibold',
                          (m.population_growth || 0) >= 0 ? 'text-green' : 'text-red',
                        )}>
                          {formatPercent(m.population_growth)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* View Details */}
                <div className="mt-4 pt-3 border-t border-border">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-light transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Market Detail Section                                        */}
      {/* ============================================================ */}
      {selectedMarket && selectedMarket.metrics && (
        <>
          <div className="border-t border-border pt-6">
            <h2 className="font-display font-semibold text-lg text-white mb-4">
              {selectedMarket.city}, {selectedMarket.state} - Market Detail
            </h2>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Median Home Value',
                  value: formatCurrency(selectedMarket.metrics.median_home_price || 0),
                  change: selectedMarket.metrics.price_change_yoy,
                  icon: Home,
                },
                {
                  label: 'Median Rent',
                  value: `$${(selectedMarket.metrics.median_rent || 0).toLocaleString()}/mo`,
                  change: selectedMarket.metrics.rent_change_yoy,
                  icon: DollarSign,
                },
                {
                  label: 'Vacancy Rate',
                  value: `${selectedMarket.metrics.vacancy_rate?.toFixed(1) || '--'}%`,
                  change: null,
                  icon: BarChart3,
                },
                {
                  label: 'Days on Market',
                  value: `${selectedMarket.metrics.days_on_market || '--'}`,
                  change: null,
                  icon: Clock,
                },
                {
                  label: 'Population Growth',
                  value: formatPercent(selectedMarket.metrics.population_growth),
                  change: selectedMarket.metrics.population_growth,
                  icon: Users,
                },
                {
                  label: 'Job Growth',
                  value: formatPercent(selectedMarket.metrics.job_growth_rate),
                  change: selectedMarket.metrics.job_growth_rate,
                  icon: Briefcase,
                },
                {
                  label: 'Median Income',
                  value: formatCurrency(selectedMarket.metrics.median_household_income || 0),
                  change: null,
                  icon: DollarSign,
                },
                {
                  label: 'Price-to-Rent Ratio',
                  value: `${selectedMarket.metrics.rent_to_price_ratio?.toFixed(1) || '--'}%`,
                  change: null,
                  icon: TrendingUp,
                },
              ].map((metric) => (
                <div key={metric.label} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium text-muted uppercase tracking-wider">{metric.label}</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10">
                      <metric.icon className="h-3.5 w-3.5 text-gold" />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-white">{metric.value}</p>
                  {metric.change !== null && metric.change !== undefined && (
                    <div className="flex items-center gap-1 mt-1">
                      {metric.change >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red" />
                      )}
                      <span className={cn(
                        'text-xs font-medium',
                        metric.change >= 0 ? 'text-green' : 'text-red',
                      )}>
                        {formatPercent(metric.change)} YoY
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================ */}
          {/*  Charts                                                       */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Price Trend */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-white">Home Price Trend</h3>
                <span className="text-xs text-muted">12-month</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={homePriceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 37, 48, 0.6)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={{ stroke: '#1E2530' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => formatCurrency(val)}
                    width={65}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#C9A84C"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#C9A84C', stroke: '#0D1117', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Rent Trend */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-white">Rent Trend</h3>
                <span className="text-xs text-muted">12-month</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 37, 48, 0.6)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={{ stroke: '#1E2530' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val: number) => `$${val.toLocaleString()}`}
                    width={65}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22C55E"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#22C55E', stroke: '#0D1117', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Inventory Levels */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-white">Inventory Levels</h3>
                <span className="text-xs text-muted">Active listings</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={inventoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 37, 48, 0.6)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={{ stroke: '#1E2530' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                  />
                  <RechartsTooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-deep border border-border rounded-lg px-3 py-2 shadow-card">
                        <p className="text-xs text-muted">{label}</p>
                        <p className="text-sm font-semibold text-white">{payload[0].value?.toLocaleString()} listings</p>
                      </div>
                    )
                  }} />
                  <Bar dataKey="listings" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Price Distribution */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-white">Price Distribution</h3>
                <span className="text-xs text-muted">By price range</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={priceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 37, 48, 0.6)" vertical={false} />
                  <XAxis
                    dataKey="range"
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    axisLine={{ stroke: '#1E2530' }}
                    tickLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <RechartsTooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-deep border border-border rounded-lg px-3 py-2 shadow-card">
                        <p className="text-xs text-muted">{label}</p>
                        <p className="text-sm font-semibold text-white">{payload[0].value} homes</p>
                      </div>
                    )
                  }} />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ============================================================ */}
          {/*  Heat Map Section                                             */}
          {/* ============================================================ */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display font-semibold text-lg text-white">Interactive Heat Map</h3>
                <p className="text-xs text-muted mt-1">
                  Neighborhood opportunity analysis - {selectedMarket.city}, {selectedMarket.state}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-green" />
                  <span className="text-xs text-muted">Opportunity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-gold" />
                  <span className="text-xs text-muted">Fair</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-red" />
                  <span className="text-xs text-muted">Overpriced</span>
                </div>
              </div>
            </div>

            {/* 8x8 Grid */}
            <div className="bg-deep border border-border rounded-lg p-4">
              <div className="grid grid-cols-8 gap-1.5 max-w-lg mx-auto">
                {heatMapData.map((value, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-sm transition-all hover:scale-110 hover:z-10 cursor-pointer"
                    style={{ backgroundColor: getHeatMapColor(value), opacity: 0.7 + value * 0.3 }}
                    title={`Zone ${i + 1}: ${value < 0.4 ? 'Opportunity' : value < 0.6 ? 'Fair value' : 'Above market'}`}
                  />
                ))}
              </div>
              <p className="text-center text-xs text-muted/60 mt-4">
                Full interactive Google Maps heat map coming with API key configuration
              </p>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/*  Opportunity Alerts                                           */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-lg text-white">Opportunity Alerts</h3>
            <span className="text-[10px] font-semibold bg-gold/10 text-gold border border-gold/20 rounded-full px-2 py-0.5">
              {MOCK_OPPORTUNITIES.length} new
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-white transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            Manage Alerts
          </button>
        </div>

        <div className="space-y-3">
          {MOCK_OPPORTUNITIES.map((opp) => {
            const severityColors: Record<string, { bg: string; icon: string; border: string }> = {
              high: { bg: 'bg-red/10', icon: 'text-red', border: 'border-red/20' },
              medium: { bg: 'bg-gold/10', icon: 'text-gold', border: 'border-gold/20' },
              low: { bg: 'bg-green/10', icon: 'text-green', border: 'border-green/20' },
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
                  colors.bg.replace('/10', '/[0.03]'),
                )}
              >
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0', colors.bg)}>
                  <Icon className={cn('h-4 w-4', colors.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{opp.title}</p>
                  <p className="text-sm text-text mt-0.5">{opp.detail}</p>
                  <p className="text-xs text-muted mt-1">{opp.timestamp}</p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-gold hover:text-gold-light transition-colors flex-shrink-0"
                >
                  View
                </button>
              </div>
            )
          })}
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
