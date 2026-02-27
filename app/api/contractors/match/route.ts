import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { category, city, state, zip } = body

    if (!category) {
      return NextResponse.json(
        { error: 'category is required' },
        { status: 400 }
      )
    }

    if (!city && !zip) {
      return NextResponse.json(
        { error: 'Either city or zip is required for location filtering' },
        { status: 400 }
      )
    }

    // Build Supabase query for contractors table
    let query = supabase
      .from('contractors')
      .select('*')
      .ilike('trade', `%${category}%`)

    // Apply location filters
    if (zip) {
      query = query.eq('zip', zip)
    } else {
      if (city) {
        query = query.ilike('city', city)
      }
      if (state) {
        query = query.ilike('state', state)
      }
    }

    const { data: contractors, error } = await query

    if (error) {
      console.error('[Contractors Match] Supabase query error:', error)
      return NextResponse.json(
        { error: 'Failed to query contractors' },
        { status: 500 }
      )
    }

    if (!contractors || contractors.length === 0) {
      return NextResponse.json({
        contractors: [],
        message: 'No contractors found matching your criteria',
      })
    }

    // Calculate composite score and sort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scored = contractors.map((contractor: any) => {
      const quality = contractor.quality ?? 0
      const priceFairness = contractor.price_fairness ?? 0
      const reliability = contractor.reliability ?? 0
      const responsiveness = contractor.responsiveness ?? 0

      // Weighted composite: quality (30%), reliability (30%), price fairness (25%), responsiveness (15%)
      const compositeScore =
        quality * 0.3 +
        reliability * 0.3 +
        priceFairness * 0.25 +
        responsiveness * 0.15

      return {
        ...contractor,
        composite_score: Math.round(compositeScore * 100) / 100,
      }
    })

    // Sort by composite score descending, take top 3
    scored.sort((a: { composite_score: number }, b: { composite_score: number }) => b.composite_score - a.composite_score)
    const top3 = scored.slice(0, 3)

    return NextResponse.json({ contractors: top3 })
  } catch (error) {
    console.error('[Contractors Match] Error:', error)
    return NextResponse.json(
      { error: 'Failed to match contractors' },
      { status: 500 }
    )
  }
}
