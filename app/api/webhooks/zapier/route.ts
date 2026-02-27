import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { fireWebhook, WEBHOOK_EVENT_TYPES } from '@/lib/webhooks/fire'

// ── Supabase Admin Client (bypasses RLS for webhook log reads) ───────────────

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── POST — Fire a webhook for a given event ──────────────────────────────────

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
    const { event_type, payload } = body

    if (!event_type) {
      return NextResponse.json(
        { error: 'event_type is required' },
        { status: 400 }
      )
    }

    // Validate the event type
    if (!WEBHOOK_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json(
        {
          error: `Invalid event_type. Must be one of: ${WEBHOOK_EVENT_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Fire webhook (non-blocking)
    fireWebhook(user.id, event_type, payload || {})

    return NextResponse.json({
      success: true,
      message: `Webhook queued for event: ${event_type}`,
    })
  } catch (error) {
    console.error('[Zapier Webhook POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fire webhook' },
      { status: 500 }
    )
  }
}

// ── GET — List the user's webhook config and recent logs ─────────────────────

export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the user's webhook config
    const { data: config } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Fetch recent webhook logs (last 50)
    const { data: logs } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      config: config || null,
      logs: logs || [],
      available_events: WEBHOOK_EVENT_TYPES,
    })
  } catch (error) {
    console.error('[Zapier Webhook GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook config' },
      { status: 500 }
    )
  }
}

// ── PUT — Upsert webhook config (URL + enabled events) ──────────────────────

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { webhook_url, events_enabled, active } = body

    if (!webhook_url) {
      return NextResponse.json(
        { error: 'webhook_url is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(webhook_url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook_url format. Must be a valid URL.' },
        { status: 400 }
      )
    }

    // Validate events_enabled array if provided
    const enabledEvents: string[] = events_enabled || []
    for (const evt of enabledEvents) {
      if (!WEBHOOK_EVENT_TYPES.includes(evt as typeof WEBHOOK_EVENT_TYPES[number])) {
        return NextResponse.json(
          {
            error: `Invalid event type: "${evt}". Must be one of: ${WEBHOOK_EVENT_TYPES.join(', ')}`,
          },
          { status: 400 }
        )
      }
    }

    // Upsert using admin client to handle the unique constraint on user_id
    const { data: config, error } = await supabaseAdmin
      .from('webhook_configs')
      .upsert(
        {
          user_id: user.id,
          webhook_url,
          events_enabled: enabledEvents,
          active: active !== undefined ? active : true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[Zapier Webhook PUT] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save webhook config' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      config,
    })
  } catch (error) {
    console.error('[Zapier Webhook PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save webhook config' },
      { status: 500 }
    )
  }
}
