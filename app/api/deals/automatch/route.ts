import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FeedDeal, BuyBox } from '@/types'

// ── POST /api/deals/automatch ───────────────────────────────────────────────
// Cron-triggered endpoint that matches new feed deals to user buy boxes
// and sends notifications for matches.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Verify cron secret ──────────────────────────────────────────────
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[AutoMatch] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient()

    // ── Fetch all buy boxes ─────────────────────────────────────────────
    const { data: buyBoxes, error: buyBoxError } = await supabase
      .from('buy_boxes')
      .select('*')

    if (buyBoxError) {
      console.error('[AutoMatch] Failed to fetch buy boxes:', buyBoxError)
      return NextResponse.json(
        { error: 'Failed to fetch buy boxes' },
        { status: 500 }
      )
    }

    if (!buyBoxes || buyBoxes.length === 0) {
      return NextResponse.json({
        matched: 0,
        notifications_sent: 0,
        message: 'No buy boxes configured',
      })
    }

    // ── Fetch recent feed deals (last 24 hours) ────────────────────────
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: recentDeals, error: dealsError } = await supabase
      .from('feed_deals')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })

    if (dealsError) {
      console.error('[AutoMatch] Failed to fetch recent deals:', dealsError)
      return NextResponse.json(
        { error: 'Failed to fetch recent deals' },
        { status: 500 }
      )
    }

    if (!recentDeals || recentDeals.length === 0) {
      return NextResponse.json({
        matched: 0,
        notifications_sent: 0,
        message: 'No new deals in the last 24 hours',
      })
    }

    // ── Match deals to buy boxes ────────────────────────────────────────
    let matchCount = 0
    let notificationsSent = 0
    const notificationsToInsert: Array<{
      user_id: string
      type: string
      title: string
      message: string
      data: Record<string, unknown>
      read: boolean
    }> = []

    // Track which (user, deal) pairs have been matched to avoid duplicates
    const matchedPairs = new Set<string>()

    for (const deal of recentDeals as FeedDeal[]) {
      for (const buyBox of buyBoxes as BuyBox[]) {
        const pairKey = `${buyBox.user_id}:${deal.id}`
        if (matchedPairs.has(pairKey)) continue

        if (isDealMatch(deal, buyBox)) {
          matchCount++
          matchedPairs.add(pairKey)

          notificationsToInsert.push({
            user_id: buyBox.user_id,
            type: 'deal_match',
            title: 'New Deal Matches Your Buy Box',
            message: `${deal.address}, ${deal.city}, ${deal.state} - $${deal.asking_price.toLocaleString()}`,
            data: {
              deal_id: deal.id,
              feed_deal_id: deal.id,
              address: deal.address,
              asking_price: deal.asking_price,
              ai_score: deal.ai_score,
              buy_box_id: buyBox.id,
              source: deal.source,
            },
            read: false,
          })
        }
      }
    }

    // ── Batch insert notifications ──────────────────────────────────────
    if (notificationsToInsert.length > 0) {
      // Insert in batches of 50 to avoid payload limits
      const batchSize = 50
      for (let i = 0; i < notificationsToInsert.length; i += batchSize) {
        const batch = notificationsToInsert.slice(i, i + batchSize)
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(
            batch.map((n) => ({
              user_id: n.user_id,
              type: n.type,
              title: n.title,
              message: n.message,
              data: n.data,
              read: n.read,
            }))
          )

        if (notifError) {
          console.error('[AutoMatch] Notification insert error:', notifError)
        } else {
          notificationsSent += batch.length
        }
      }
    }

    console.log(
      `[AutoMatch] Processed ${recentDeals.length} deals against ${buyBoxes.length} buy boxes. Matched: ${matchCount}, Notifications: ${notificationsSent}`
    )

    return NextResponse.json({
      matched: matchCount,
      notifications_sent: notificationsSent,
      deals_checked: recentDeals.length,
      buy_boxes_checked: buyBoxes.length,
    })
  } catch (error) {
    console.error('[AutoMatch POST] Error:', error)
    return NextResponse.json(
      { error: 'Auto-match failed' },
      { status: 500 }
    )
  }
}

// ── Match logic ─────────────────────────────────────────────────────────────

function isDealMatch(deal: FeedDeal, buyBox: BuyBox): boolean {
  // 1. Market match: deal city/state must be in buy box markets
  if (buyBox.markets && buyBox.markets.length > 0) {
    const dealCity = deal.city?.toLowerCase().trim() || ''
    const dealState = deal.state?.toLowerCase().trim() || ''
    const dealLocation = `${dealCity}, ${dealState}`

    const marketMatch = buyBox.markets.some((market) => {
      const m = market.toLowerCase().trim()
      return (
        dealCity === m ||
        dealState === m ||
        dealCity.includes(m) ||
        dealLocation.includes(m) ||
        m.includes(dealCity)
      )
    })

    if (!marketMatch) return false
  }

  // 2. Property type match
  if (buyBox.property_types && buyBox.property_types.length > 0) {
    const dealType = deal.property_type?.toLowerCase().trim() || ''
    const typeMatch = buyBox.property_types.some(
      (pt) => pt.toLowerCase().trim() === dealType
    )
    if (!typeMatch) return false
  }

  // 3. Price range match
  if (buyBox.price_min && deal.asking_price < buyBox.price_min) return false
  if (buyBox.price_max && deal.asking_price > buyBox.price_max) return false

  // 4. Minimum bedrooms match
  if (buyBox.min_bedrooms && (deal.bedrooms || 0) < buyBox.min_bedrooms) return false

  // 5. Minimum cap rate match
  if (
    buyBox.min_cap_rate &&
    deal.cap_rate_estimate !== null &&
    deal.cap_rate_estimate !== undefined &&
    deal.cap_rate_estimate < buyBox.min_cap_rate
  ) {
    return false
  }

  return true
}
