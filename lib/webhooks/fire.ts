import { createClient } from '@supabase/supabase-js'

// ── Supabase Admin Client (bypasses RLS for webhook processing) ──────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Supported Event Types ────────────────────────────────────────────────────

export const WEBHOOK_EVENT_TYPES = [
  'rent_received',
  'maintenance_created',
  'tenant_added',
  'deal_saved',
  'lease_expiring',
  'agent_action',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

// ── Fire Webhook ─────────────────────────────────────────────────────────────

/**
 * Fires a webhook to the user's configured URL if the event type is enabled.
 * Non-blocking: fire-and-forget with error catching and logging.
 *
 * @param userId   - The authenticated user's ID
 * @param eventType - One of the supported webhook event types
 * @param payload  - The event payload to send
 */
export async function fireWebhook(
  userId: string,
  eventType: string,
  payload: object
): Promise<void> {
  // Fire-and-forget: wrap everything so the caller is never blocked
  _fireWebhookInternal(userId, eventType, payload).catch((err) => {
    console.error('[Webhook Fire] Unhandled error:', err)
  })
}

async function _fireWebhookInternal(
  userId: string,
  eventType: string,
  payload: object
): Promise<void> {
  try {
    // 1. Look up user's webhook config
    const { data: config, error: configError } = await supabaseAdmin
      .from('webhook_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .single()

    if (configError || !config) {
      // No active webhook configured — silently skip
      return
    }

    // 2. Check if this event type is enabled
    const enabledEvents: string[] = config.events_enabled || []
    if (!enabledEvents.includes(eventType)) {
      return
    }

    // 3. Build the webhook payload
    const webhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      user_id: userId,
      data: payload,
    }

    // 4. POST to the user's webhook URL
    let responseStatus: number | null = null
    let responseBody: string | null = null
    let errorMessage: string | null = null

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': eventType,
          'X-Webhook-Source': 'rkv-consulting',
        },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      })

      clearTimeout(timeout)
      responseStatus = response.status
      responseBody = await response.text().catch(() => null)
    } catch (fetchError) {
      errorMessage =
        fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
      console.error(
        `[Webhook Fire] Failed to reach ${config.webhook_url}:`,
        errorMessage
      )
    }

    // 5. Log the webhook attempt
    await supabaseAdmin.from('webhook_logs').insert({
      user_id: userId,
      event_type: eventType,
      payload: webhookPayload,
      response_status: responseStatus,
      response_body: responseBody,
      error: errorMessage,
    })
  } catch (err) {
    console.error('[Webhook Fire] Internal error:', err)
  }
}
