import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanName } from '@/lib/stripe/plans'
import { searchListings } from '@/lib/apis/zillow'
import { fetchPropertyValuation } from '@/lib/apis/attom'
import type { FeedDeal, DealFeedSource } from '@/types'

export const dynamic = 'force-dynamic';

// ── GET /api/deals/feed ─────────────────────────────────────────────────────
// Aggregates deals from multiple sources into a unified, filterable feed.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Check subscription for dealFeed feature ─────────────────────────
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    if (!plan.features.dealFeed) {
      return NextResponse.json(
        {
          error:
            'Deal Feed is not available on your current plan. Upgrade to Pro or Elite to access the deal feed.',
        },
        { status: 403 }
      )
    }

    // ── Parse query parameters ──────────────────────────────────────────
    const { searchParams } = new URL(req.url)
    const markets = searchParams.get('markets')?.split(',').map((m) => m.trim().toLowerCase()) || []
    const propertyType = searchParams.get('property_type')
    const priceMin = searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null
    const priceMax = searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null
    const minBedrooms = searchParams.get('min_bedrooms') ? Number(searchParams.get('min_bedrooms')) : null
    const minCapRate = searchParams.get('min_cap_rate') ? Number(searchParams.get('min_cap_rate')) : null
    const source = searchParams.get('source') as DealFeedSource | null
    const sort = searchParams.get('sort') || 'newest'
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')))
    const refresh = searchParams.get('refresh') === 'true'

    // ── Force refresh: pull from Zillow and upsert into feed_deals ──────
    if (refresh && markets.length > 0) {
      await refreshFromExternalAPIs(supabase, markets, propertyType, priceMin, priceMax, minBedrooms)
    }

    // ── Fetch from Supabase in parallel ─────────────────────────────────
    const [feedDealsResult, wholesaleResult] = await Promise.all([
      supabase
        .from('feed_deals')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('wholesale_submissions')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
    ])

    // ── Check if cache is stale (>1 hour) and trigger background refresh
    if (!refresh && markets.length > 0) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const hasStaleData =
        !feedDealsResult.data?.length ||
        feedDealsResult.data.every((d: { updated_at: string }) => d.updated_at < oneHourAgo)

      if (hasStaleData) {
        // Fire-and-forget background refresh (don't await)
        refreshFromExternalAPIs(supabase, markets, propertyType, priceMin, priceMax, minBedrooms).catch(
          (err) => console.error('[DealFeed] Background refresh failed:', err)
        )
      }
    }

    // ── Normalize wholesale submissions into FeedDeal shape ─────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feedDeals: FeedDeal[] = (feedDealsResult.data || []).map((d: any) => ({
      ...d,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wholesaleAsFeed: FeedDeal[] = (wholesaleResult.data || []).map((ws: any) => ({
      id: ws.id,
      user_id: null,
      address: ws.address,
      city: ws.city || '',
      state: ws.state || '',
      zip: ws.zip || '',
      property_type: ws.property_type || 'single_family',
      asking_price: ws.asking_price,
      bedrooms: ws.bedrooms,
      bathrooms: ws.bathrooms,
      sqft: ws.sqft,
      year_built: null,
      lot_size: null,
      source: 'wholesale' as DealFeedSource,
      source_id: ws.id,
      image_url: ws.photos?.[0] || null,
      days_on_market: null,
      arv_estimate: ws.arv,
      rent_estimate: null,
      cap_rate_estimate: null,
      ai_score: ws.ai_score,
      description: ws.description,
      contact_name: ws.submitter_name,
      contact_phone: ws.submitter_phone,
      contact_email: ws.submitter_email,
      raw_data: null,
      created_at: ws.created_at,
      updated_at: ws.created_at,
    }))

    // ── Merge and deduplicate by address ─────────────────────────────────
    const seenAddresses = new Set<string>()
    const allDeals: FeedDeal[] = []

    for (const deal of [...feedDeals, ...wholesaleAsFeed]) {
      const key = deal.address.toLowerCase().trim()
      if (!seenAddresses.has(key)) {
        seenAddresses.add(key)
        allDeals.push(deal)
      }
    }

    // ── Apply filters ───────────────────────────────────────────────────
    let filtered = allDeals

    if (markets.length > 0) {
      filtered = filtered.filter((d) => {
        const dealCity = d.city?.toLowerCase().trim() || ''
        const dealState = d.state?.toLowerCase().trim() || ''
        const dealLocation = `${dealCity}, ${dealState}`
        return markets.some(
          (m) =>
            dealCity.includes(m) ||
            dealState.includes(m) ||
            dealLocation.includes(m)
        )
      })
    }

    if (propertyType) {
      filtered = filtered.filter((d) => d.property_type === propertyType)
    }

    if (priceMin !== null) {
      filtered = filtered.filter((d) => d.asking_price >= priceMin)
    }

    if (priceMax !== null) {
      filtered = filtered.filter((d) => d.asking_price <= priceMax)
    }

    if (minBedrooms !== null) {
      filtered = filtered.filter((d) => (d.bedrooms || 0) >= minBedrooms)
    }

    if (minCapRate !== null) {
      filtered = filtered.filter((d) => (d.cap_rate_estimate || 0) >= minCapRate)
    }

    if (source) {
      filtered = filtered.filter((d) => d.source === source)
    }

    // ── Sort results ────────────────────────────────────────────────────
    switch (sort) {
      case 'score':
        filtered.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
        break
      case 'price_asc':
        filtered.sort((a, b) => a.asking_price - b.asking_price)
        break
      case 'cap_rate':
        filtered.sort((a, b) => (b.cap_rate_estimate || 0) - (a.cap_rate_estimate || 0))
        break
      case 'newest':
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        break
    }

    // ── Paginate ────────────────────────────────────────────────────────
    const total = filtered.length
    const offset = (page - 1) * limit
    const paginated = filtered.slice(offset, offset + limit)

    return NextResponse.json({
      deals: paginated,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[DealFeed GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal feed' },
      { status: 500 }
    )
  }
}

// ── External API refresh helper ─────────────────────────────────────────────

async function refreshFromExternalAPIs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  markets: string[],
  propertyType: string | null,
  priceMin: number | null,
  priceMax: number | null,
  minBedrooms: number | null
) {
  try {
    const zillowPromises = markets.map((market) =>
      searchListings({
        location: market,
        status: 'ForSale',
        price_min: priceMin || undefined,
        price_max: priceMax || undefined,
        beds_min: minBedrooms || undefined,
        home_type: propertyType || undefined,
        sort: 'Newest',
      })
    )

    const results = await Promise.allSettled(zillowPromises)

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value?.results) continue

      for (const listing of result.value.results) {
        // Attempt to get ARV from ATTOM (best-effort, don't block on failure)
        let arvEstimate: number | null = null
        try {
          const fullAddress = `${listing.address}, ${listing.city}, ${listing.state} ${listing.zipcode}`
          const valuation = await fetchPropertyValuation(fullAddress)
          if (valuation?.avm?.amount?.value) {
            arvEstimate = valuation.avm.amount.value
          }
        } catch {
          // Non-critical: skip ARV if ATTOM fails
        }

        const capRateEstimate =
          listing.rentZestimate && listing.price
            ? Number(
                (
                  ((listing.rentZestimate * 12 - listing.price * 0.03) /
                    listing.price) *
                  100
                ).toFixed(2)
              )
            : null

        const feedDeal = {
          address: listing.address,
          city: listing.city,
          state: listing.state,
          zip: listing.zipcode,
          property_type: mapHomeType(listing.homeType),
          asking_price: listing.price,
          bedrooms: listing.bedrooms || null,
          bathrooms: listing.bathrooms || null,
          sqft: listing.livingArea || null,
          year_built: listing.yearBuilt || null,
          lot_size: listing.lotAreaValue || null,
          source: 'mls' as DealFeedSource,
          source_id: listing.zpid,
          image_url: listing.imgSrc || null,
          days_on_market: listing.daysOnZillow || null,
          arv_estimate: arvEstimate,
          rent_estimate: listing.rentZestimate || null,
          cap_rate_estimate: capRateEstimate,
          ai_score: null,
          description: null,
          contact_name: null,
          contact_phone: null,
          contact_email: null,
          raw_data: listing as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        }

        // Upsert by address to avoid duplicates
        await supabase
          .from('feed_deals')
          .upsert(feedDeal, { onConflict: 'address' })
      }
    }
  } catch (error) {
    console.error('[DealFeed] refreshFromExternalAPIs error:', error)
  }
}

// ── Map Zillow homeType to our property_type enum ───────────────────────────

function mapHomeType(homeType: string): string {
  const typeMap: Record<string, string> = {
    SINGLE_FAMILY: 'single_family',
    MULTI_FAMILY: 'multi_family',
    CONDO: 'condo',
    TOWNHOUSE: 'townhouse',
    MANUFACTURED: 'single_family',
    LOT: 'land',
    APARTMENT: 'multi_family',
  }
  return typeMap[homeType?.toUpperCase()] || 'single_family'
}
