import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* ------------------------------------------------------------------ */
/*  GET - Fetch user's alert configuration                             */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to fetch existing alert config from user metadata
    const metadata = user.user_metadata || {}
    const alertConfig = metadata.market_alert_thresholds || null

    return NextResponse.json({
      config: alertConfig,
      enabled: metadata.market_alerts_enabled ?? false,
    })
  } catch (error) {
    console.error('[Alert Config GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert configuration' },
      { status: 500 }
    )
  }
}

/* ------------------------------------------------------------------ */
/*  POST - Save user's alert configuration                             */
/* ------------------------------------------------------------------ */

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
    const { thresholds, enabled } = body

    // Validate thresholds
    if (thresholds) {
      if (thresholds.capRateThreshold !== undefined && (thresholds.capRateThreshold < 0 || thresholds.capRateThreshold > 30)) {
        return NextResponse.json({ error: 'Cap rate threshold must be between 0 and 30' }, { status: 400 })
      }
      if (thresholds.medianPriceThreshold !== undefined && thresholds.medianPriceThreshold < 0) {
        return NextResponse.json({ error: 'Median price threshold must be positive' }, { status: 400 })
      }
      if (thresholds.rentToPriceThreshold !== undefined && (thresholds.rentToPriceThreshold < 0 || thresholds.rentToPriceThreshold > 5)) {
        return NextResponse.json({ error: 'Rent-to-price threshold must be between 0 and 5' }, { status: 400 })
      }
    }

    // Save to user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        market_alert_thresholds: thresholds || null,
        market_alerts_enabled: enabled ?? false,
      },
    })

    if (updateError) {
      console.error('[Alert Config POST] Supabase update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save alert configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      config: thresholds,
      enabled: enabled ?? false,
    })
  } catch (error) {
    console.error('[Alert Config POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save alert configuration' },
      { status: 500 }
    )
  }
}
