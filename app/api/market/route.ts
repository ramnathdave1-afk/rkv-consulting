import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchMarketData } from '@/lib/apis/rentcast'
import { fetchMortgageRate, fetchUnemploymentRate } from '@/lib/apis/fred'
import { PLANS, type PlanName } from '@/lib/stripe/plans'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription for market intelligence
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    if (!plan.features.marketIntelligence) {
      return NextResponse.json(
        { error: 'Market Intelligence is not available on your current plan. Upgrade to Pro or Elite.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const zip = searchParams.get('zip')
    const city = searchParams.get('city')
    const state = searchParams.get('state')

    if (!zip && !city) {
      return NextResponse.json(
        { error: 'Either zip or city parameter is required' },
        { status: 400 }
      )
    }

    // Fetch data from multiple sources in parallel
    const [rentcastData, mortgageRate, unemploymentRate] = await Promise.all([
      zip ? fetchMarketData(zip) : null,
      fetchMortgageRate(),
      state ? fetchUnemploymentRate(state) : fetchUnemploymentRate(),
    ])

    // Aggregate market data
    const marketData = {
      location: {
        zip: zip || rentcastData?.zipCode || null,
        city: city || rentcastData?.city || null,
        state: state || rentcastData?.state || null,
        county: rentcastData?.county || null,
      },
      rental: {
        median_rent: rentcastData?.medianRent || null,
        average_rent: rentcastData?.averageRent || null,
        median_rent_per_sqft: rentcastData?.medianRentPerSqft || null,
        average_rent_per_sqft: rentcastData?.averageRentPerSqft || null,
      },
      sales: {
        median_home_value: rentcastData?.medianListPrice || null,
        average_list_price: rentcastData?.averageListPrice || null,
        median_price_per_sqft: rentcastData?.medianPricePerSqft || null,
        average_price_per_sqft: rentcastData?.averagePricePerSqft || null,
        average_days_on_market: rentcastData?.averageDaysOnMarket || null,
        total_listings: rentcastData?.totalListings || null,
      },
      economics: {
        mortgage_rate_30yr: mortgageRate,
        unemployment_rate: unemploymentRate,
      },
      investment: {
        rent_to_price_ratio:
          rentcastData?.medianRent && rentcastData?.medianListPrice
            ? ((rentcastData.medianRent * 12) / rentcastData.medianListPrice * 100)
            : null,
        gross_rent_multiplier:
          rentcastData?.medianListPrice && rentcastData?.medianRent
            ? (rentcastData.medianListPrice / (rentcastData.medianRent * 12))
            : null,
        estimated_cap_rate:
          rentcastData?.medianRent && rentcastData?.medianListPrice
            ? (((rentcastData.medianRent * 12 * 0.55) / rentcastData.medianListPrice) * 100)
            : null,
      },
      metadata: {
        data_sources: ['rentcast', 'fred'],
        fetched_at: new Date().toISOString(),
      },
    }

    return NextResponse.json({ market: marketData })
  } catch (error) {
    console.error('[Market] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}
