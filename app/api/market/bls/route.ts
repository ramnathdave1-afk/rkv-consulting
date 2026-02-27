import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJobGrowth, getMedianIncome, getUnemploymentRate } from '@/lib/apis/bls'

// ── In-memory cache (30 minutes — BLS data updates infrequently) ──────────

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 60 * 1000

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

// ── Route Handler ─────────────────────────────────────────────────────────

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
    const metro = searchParams.get('metro')
    const state = searchParams.get('state')

    if (!metro || !state) {
      return NextResponse.json(
        { error: 'Both metro and state query parameters are required' },
        { status: 400 }
      )
    }

    // Check cache
    const cacheKey = `bls:${metro.toLowerCase()}:${state.toUpperCase()}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ ...(cached as Record<string, unknown>), cached: true })
    }

    // Fetch all three BLS data points in parallel
    const [jobGrowthResult, medianIncomeResult, unemploymentResult] = await Promise.allSettled([
      getJobGrowth(metro),
      getMedianIncome(metro),
      getUnemploymentRate(state),
    ])

    const jobGrowth = jobGrowthResult.status === 'fulfilled' ? jobGrowthResult.value : null
    const medianIncome = medianIncomeResult.status === 'fulfilled' ? medianIncomeResult.value : null
    const unemployment = unemploymentResult.status === 'fulfilled' ? unemploymentResult.value : null

    if (jobGrowthResult.status === 'rejected') {
      console.error('[BLS Route] Job growth fetch failed:', jobGrowthResult.reason)
    }
    if (medianIncomeResult.status === 'rejected') {
      console.error('[BLS Route] Median income fetch failed:', medianIncomeResult.reason)
    }
    if (unemploymentResult.status === 'rejected') {
      console.error('[BLS Route] Unemployment fetch failed:', unemploymentResult.reason)
    }

    const responseData = {
      jobGrowth: jobGrowth
        ? {
            rate: jobGrowth.growthRate,
            currentEmployment: jobGrowth.currentEmployment,
            previousYear: jobGrowth.previousYear,
          }
        : null,
      medianIncome: medianIncome
        ? {
            value: medianIncome.medianIncome,
            percentChange: medianIncome.percentChange,
          }
        : null,
      unemployment: unemployment
        ? {
            rate: unemployment.rate,
            previousRate: unemployment.previousRate,
            change: unemployment.change,
          }
        : null,
      metro,
      state,
      fetched_at: new Date().toISOString(),
    }

    setCache(cacheKey, responseData)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[BLS Route] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BLS economic data' },
      { status: 500 }
    )
  }
}
