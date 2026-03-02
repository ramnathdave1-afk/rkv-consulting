import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

// ── Supabase Admin Client (bypasses RLS for webhook processing) ─────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── SendGrid Signature Validation ───────────────────────────────────────────

function validateSendGridSignature(
  req: NextRequest,
  rawBody: string
): boolean {
  const webhookKey = process.env.SENDGRID_WEBHOOK_KEY
  if (!webhookKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SendGrid Webhook] SENDGRID_WEBHOOK_KEY not set in production!')
    }
    return true // dev mode bypass
  }

  const signature = req.headers.get('x-twilio-email-event-webhook-signature')
  const timestamp = req.headers.get('x-twilio-email-event-webhook-timestamp')

  if (!signature || !timestamp) {
    console.error('[SendGrid Webhook] Missing signature or timestamp headers')
    return false
  }

  // SendGrid Event Webhook uses ECDSA signature verification
  // The signed payload is: timestamp + raw body
  const payload = timestamp + rawBody

  try {
    const verifier = crypto.createVerify('sha256')
    verifier.update(payload)
    verifier.end()
    return verifier.verify(webhookKey, signature, 'base64')
  } catch (error) {
    console.error('[SendGrid Webhook] Signature verification error:', error)
    return false
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

interface SendGridEvent {
  event: string
  sg_message_id?: string
  email?: string
  timestamp?: number
  url?: string
  useragent?: string
  ip?: string
  reason?: string
  status?: string
  response?: string
  type?: string
  // Custom metadata attached when sending
  [key: string]: unknown
}

// ── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Validate SendGrid signature
    if (!validateSendGridSignature(req, rawBody)) {
      console.error('[SendGrid Webhook] Invalid signature')
      // Still return 200 to avoid retries
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Parse the event batch (SendGrid sends arrays of events)
    let events: SendGridEvent[]
    try {
      events = JSON.parse(rawBody)
    } catch {
      console.error('[SendGrid Webhook] Failed to parse event body')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (!Array.isArray(events)) {
      console.error('[SendGrid Webhook] Expected an array of events')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    console.log(`[SendGrid Webhook] Processing ${events.length} event(s)`)

    // Process each event
    for (const event of events) {
      await processEvent(event)
    }

    // Always return 200 OK quickly
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[SendGrid Webhook] Unhandled error:', error)
    // Return 200 even on error to prevent SendGrid from retrying
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// ── Event Processor ─────────────────────────────────────────────────────────

async function processEvent(event: SendGridEvent): Promise<void> {
  const { event: eventType, sg_message_id } = event

  if (!sg_message_id) {
    console.warn('[SendGrid Webhook] Event missing sg_message_id, skipping:', eventType)
    return
  }

  // Strip the filter ID suffix from sg_message_id (format: "abc123.filter0001")
  const messageId = sg_message_id.split('.')[0]

  console.log(`[SendGrid Webhook] Event: ${eventType} for message ${messageId}`)

  switch (eventType) {
    case 'delivered': {
      await updateAgentLog(messageId, {
        status: 'delivered',
        outcome: 'Email delivered successfully',
      })
      break
    }

    case 'open': {
      // Track email opens - update outcome but do not change status
      // (delivered -> opened is informational)
      const { data: existingLog } = await supabaseAdmin
        .from('agent_logs')
        .select('outcome')
        .eq('agent_type', 'email')
        .ilike('outcome', `%${messageId}%`)
        .limit(1)
        .single()

      const currentOutcome = existingLog?.outcome || ''
      const openCount = (currentOutcome.match(/opened/g) || []).length
      const updatedOutcome = openCount > 0
        ? `Email opened (${openCount + 1}x)`
        : 'Email opened'

      await updateAgentLog(messageId, {
        outcome: updatedOutcome,
      })
      break
    }

    case 'click': {
      const clickUrl = event.url || 'unknown'
      await updateAgentLog(messageId, {
        outcome: `Email link clicked: ${clickUrl}`,
      })
      break
    }

    case 'bounce': {
      const bounceReason = event.reason || 'Unknown bounce reason'
      const bounceType = event.type || 'unknown'
      await updateAgentLog(messageId, {
        status: 'bounced',
        outcome: `Email bounced (${bounceType}): ${bounceReason}`,
      })
      break
    }

    case 'dropped': {
      const dropReason = event.reason || 'Unknown drop reason'
      await updateAgentLog(messageId, {
        status: 'failed',
        outcome: `Email dropped: ${dropReason}`,
      })
      break
    }

    case 'deferred': {
      await updateAgentLog(messageId, {
        outcome: `Email deferred: ${event.response || 'temporary failure'}`,
      })
      break
    }

    case 'spamreport': {
      await updateAgentLog(messageId, {
        status: 'failed',
        outcome: 'Recipient reported email as spam',
      })
      break
    }

    default:
      console.log(`[SendGrid Webhook] Unhandled event type: ${eventType}`)
  }
}

// ── Database Helper ─────────────────────────────────────────────────────────

async function updateAgentLog(
  messageId: string,
  data: Record<string, unknown>
): Promise<void> {
  // Match agent_logs by finding the message ID in the outcome or content fields
  // The email agent typically stores the SendGrid message ID in the outcome
  const { error } = await supabaseAdmin
    .from('agent_logs')
    .update(data)
    .eq('agent_type', 'email')
    .ilike('outcome', `%${messageId}%`)

  if (error) {
    // Fallback: try matching by subject or a broader search
    console.warn(`[SendGrid Webhook] Primary match failed for ${messageId}, trying subject fallback`)

    const { error: fallbackError } = await supabaseAdmin
      .from('agent_logs')
      .update(data)
      .eq('agent_type', 'email')
      .ilike('content', `%${messageId}%`)

    if (fallbackError) {
      console.error(`[SendGrid Webhook] Failed to update agent_log for message ${messageId}:`, fallbackError)
    }
  }
}
