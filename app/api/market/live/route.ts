import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchMarketData } from '@/lib/apis/rentcast'
import { fetchMortgageRate } from '@/lib/apis/fred'

// ── In-memory cache (15 minutes) ────────────────────────────────────────────

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

function getCached(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const zip = searchParams.get('zip')

    if (!city && !zip) {
      return NextResponse.json(
        { error: 'Either city or zip parameter is required' },
        { status: 400 }
      )
    }

    // Build cache key from query params
    const cacheKey = `market-live:${zip || ''}:${city || ''}:${state || ''}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ market: cached, cached: true })
    }

    // Fetch data from multiple sources in parallel; handle partial failures
    const [rentcastResult, mortgageRateResult] = await Promise.allSettled([
      zip ? fetchMarketData(zip) : Promise.resolve(null),
      fetchMortgageRate(),
    ])

    const rentcastData =
      rentcastResult.status === 'fulfilled' ? rentcastResult.value : null
    const mortgageRate =
      mortgageRateResult.status === 'fulfilled' ? mortgageRateResult.value : null

    if (rentcastResult.status === 'rejected') {
      console.error('[Market Live] Rentcast fetch failed:', rentcastResult.reason)
    }
    if (mortgageRateResult.status === 'rejected') {
      console.error('[Market Live] FRED mortgage rate fetch failed:', mortgageRateResult.reason)
    }

    // Aggregate market data
    const marketData = {
      location: {
        zip: zip || rentcastData?.zipCode || null,
        city: city || rentcastData?.city || null,
        state: state || rentcastData?.state || null,
        county: rentcastData?.county || null,
      },
      rental: {
        median_rent: rentcastData?.medianRent ?? null,
        average_rent: rentcastData?.averageRent ?? null,
        median_rent_per_sqft: rentcastData?.medianRentPerSqft ?? null,
        average_rent_per_sqft: rentcastData?.averageRentPerSqft ?? null,
      },
      sales: {
        median_home_value: rentcastData?.medianListPrice ?? null,
        average_list_price: rentcastData?.averageListPrice ?? null,
        median_price_per_sqft: rentcastData?.medianPricePerSqft ?? null,
        average_price_per_sqft: rentcastData?.averagePricePerSqft ?? null,
        average_days_on_market: rentcastData?.averageDaysOnMarket ?? null,
        total_listings: rentcastData?.totalListings ?? null,
      },
      economics: {
        mortgage_rate_30yr: mortgageRate,
      },
      investment: {
        rent_to_price_ratio:
          rentcastData?.medianRent && rentcastData?.medianListPrice
            ? ((rentcastData.medianRent * 12) / rentcastData.medianListPrice) * 100
            : null,
        gross_rent_multiplier:
          rentcastData?.medianListPrice && rentcastData?.medianRent
            ? rentcastData.medianListPrice / (rentcastData.medianRent * 12)
            : null,
        estimated_cap_rate:
          rentcastData?.medianRent && rentcastData?.medianListPrice
            ? ((rentcastData.medianRent * 12 * 0.55) / rentcastData.medianListPrice) * 100
            : null,
      },
      metadata: {
        data_sources: [
          ...(rentcastData ? ['rentcast'] : []),
          ...(mortgageRate !== null ? ['fred'] : []),
        ],
        fetched_at: new Date().toISOString(),
      },
    }

    setCache(cacheKey, marketData)

    return NextResponse.json({ market: marketData })
  } catch (error) {
    console.error('[Market Live] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live market data' },
      { status: 500 }
    )
  }
}
