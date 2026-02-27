import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

export const dynamic = 'force-dynamic';

// ── In-memory cache (1 hour) ─────────────────────────────────────────────────

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

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

// ── Allowed FRED series ──────────────────────────────────────────────────────

const ALLOWED_SERIES = new Set([
  'MORTGAGE30US',
  'MORTGAGE15US',
  'FEDFUNDS',
  'UNRATE',
  'CPIAUCSL',
])

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
    const series = searchParams.get('series')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 12

    if (!series) {
      return NextResponse.json(
        { error: 'series parameter is required' },
        { status: 400 }
      )
    }

    if (!ALLOWED_SERIES.has(series)) {
      return NextResponse.json(
        {
          error: `Invalid series. Allowed values: ${Array.from(ALLOWED_SERIES).join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (isNaN(limit) || limit < 1 || limit > 120) {
      return NextResponse.json(
        { error: 'limit must be a number between 1 and 120' },
        { status: 400 }
      )
    }

    // Check cache
    const cacheKey = `market-historical:${series}:${limit}`
    const cached = getCached(cacheKey)
    if (cached) {
      return NextResponse.json({ series, data: cached, cached: true })
    }

    // Fetch from FRED API
    const response = await axios.get(
      'https://api.stlouisfed.org/fred/series/observations',
      {
        params: {
          api_key: process.env.FRED_API_KEY || '',
          file_type: 'json',
          series_id: series,
          sort_order: 'desc',
          limit,
        },
      }
    )

    const observations = response.data?.observations
    if (!observations || !Array.isArray(observations)) {
      return NextResponse.json(
        { error: 'No data returned from FRED' },
        { status: 502 }
      )
    }

    // Transform to { date, value } and filter out non-numeric values
    const data = observations
      .map((obs: { date: string; value: string }) => ({
        date: obs.date,
        value: parseFloat(obs.value),
      }))
      .filter((item: { date: string; value: number }) => !isNaN(item.value))
      .reverse() // chronological order (oldest first)

    setCache(cacheKey, data)

    return NextResponse.json({ series, data })
  } catch (error) {
    console.error('[Market Historical] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    )
  }
}
