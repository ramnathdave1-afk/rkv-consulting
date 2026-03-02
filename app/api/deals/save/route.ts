import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanName } from '@/lib/stripe/plans'

// ── POST /api/deals/save ────────────────────────────────────────────────────
// Saves a feed deal to the user's deal pipeline as a new lead.
// ─────────────────────────────────────────────────────────────────────────────

interface SaveDealRequest {
  feed_deal_id?: string
  address: string
  city?: string
  state?: string
  zip?: string
  property_type?: string
  asking_price: number
  source?: string
  image_url?: string | null
  rent_estimate?: number | null
  arv_estimate?: number | null
  ai_score?: number | null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Check subscription for deal pipeline limit ──────────────────────
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]
    const dealPipelineLimit = plan.features.dealPipelineLimit as number

    // Count existing deals
    const { count } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const currentCount = count || 0

    if (dealPipelineLimit !== Infinity && currentCount >= dealPipelineLimit) {
      return NextResponse.json(
        {
          error: `You have reached your deal pipeline limit (${dealPipelineLimit} deals on the ${plan.name} plan). Upgrade to add more deals.`,
          currentCount,
          limit: dealPipelineLimit,
        },
        { status: 403 }
      )
    }

    // ── Parse and validate body ─────────────────────────────────────────
    const body: SaveDealRequest = await req.json()

    if (!body.address || !body.asking_price) {
      return NextResponse.json(
        { error: 'Address and asking_price are required' },
        { status: 400 }
      )
    }

    // ── Check for duplicate (same address, same user) ───────────────────
    const { data: existing } = await supabase
      .from('deals')
      .select('id')
      .eq('user_id', user.id)
      .ilike('address', body.address.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You already have this deal in your pipeline', deal_id: existing.id },
        { status: 409 }
      )
    }

    // ── Insert into deals table ─────────────────────────────────────────
    const dealData = {
      user_id: user.id,
      title: body.address,
      address: body.address,
      city: body.city || '',
      state: body.state || '',
      zip: body.zip || '',
      property_type: body.property_type || 'single_family',
      asking_price: body.asking_price,
      offer_price: null,
      arv: body.arv_estimate || null,
      repair_cost: null,
      monthly_rent_estimate: body.rent_estimate || null,
      status: 'lead',
      priority: 'medium',
      source: body.source || 'deal_feed',
      agent_name: null,
      agent_phone: null,
      agent_email: null,
      analysis: body.ai_score
        ? { feed_ai_score: body.ai_score }
        : null,
      notes: body.feed_deal_id
        ? `Saved from deal feed (feed_deal_id: ${body.feed_deal_id})`
        : 'Saved from deal feed',
      image_url: body.image_url || null,
      close_date: null,
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .insert(dealData)
      .select()
      .single()

    if (error) {
      console.error('[DealSave POST] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save deal' },
        { status: 500 }
      )
    }

    // ── Increment saves count on the feed deal if applicable ────────────
    if (body.feed_deal_id) {
      await supabase.rpc('increment_field', {
        table_name: 'feed_deals',
        row_id: body.feed_deal_id,
        field_name: 'saves',
        amount: 1,
      }).catch(() => {
        // Non-critical: feed_deals may not have an RPC or saves column
      })
    }

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('[DealSave POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save deal' },
      { status: 500 }
    )
  }
}
