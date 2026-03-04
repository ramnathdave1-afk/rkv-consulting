import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Supabase Admin Client (bypasses RLS for webhook processing) ─────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Resend Webhook Event Types ──────────────────────────────────────────────

interface ResendWebhookEvent {
  type: string
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at?: string
    // Bounce-specific
    bounce?: {
      message: string
    }
    // Click-specific
    click?: {
      link: string
    }
  }
}

// ── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Optionally validate Resend webhook signature
    const svixId = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn('[Resend Webhook] Missing svix headers — processing anyway')
    }

    let event: ResendWebhookEvent
    try {
      event = JSON.parse(rawBody)
    } catch {
      console.error('[Resend Webhook] Failed to parse event body')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    console.log(`[Resend Webhook] Processing event: ${event.type}`)

    const emailId = event.data?.email_id
    if (!emailId) {
      console.warn('[Resend Webhook] Event missing email_id, skipping')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    switch (event.type) {
      case 'email.delivered': {
        await updateAgentLog(emailId, {
          status: 'delivered',
          outcome: 'Email delivered successfully',
        })
        break
      }

      case 'email.opened': {
        const { data: existingLog } = await supabaseAdmin
          .from('agent_logs')
          .select('outcome')
          .eq('agent_type', 'email')
          .ilike('outcome', `%${emailId}%`)
          .limit(1)
          .single()

        const currentOutcome = existingLog?.outcome || ''
        const openCount = (currentOutcome.match(/opened/g) || []).length
        const updatedOutcome = openCount > 0
          ? `Email opened (${openCount + 1}x)`
          : 'Email opened'

        await updateAgentLog(emailId, { outcome: updatedOutcome })
        break
      }

      case 'email.clicked': {
        const clickUrl = event.data?.click?.link || 'unknown'
        await updateAgentLog(emailId, {
          outcome: `Email link clicked: ${clickUrl}`,
        })
        break
      }

      case 'email.bounced': {
        const bounceMsg = event.data?.bounce?.message || 'Unknown bounce reason'
        await updateAgentLog(emailId, {
          status: 'bounced',
          outcome: `Email bounced: ${bounceMsg}`,
        })
        break
      }

      case 'email.complained': {
        await updateAgentLog(emailId, {
          status: 'failed',
          outcome: 'Recipient reported email as spam',
        })
        break
      }

      default:
        console.log(`[Resend Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Resend Webhook] Unhandled error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// ── Database Helper ─────────────────────────────────────────────────────────

async function updateAgentLog(
  emailId: string,
  data: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('agent_logs')
    .update(data)
    .eq('agent_type', 'email')
    .ilike('outcome', `%${emailId}%`)

  if (error) {
    console.warn(`[Resend Webhook] Primary match failed for ${emailId}, trying content fallback`)

    const { error: fallbackError } = await supabaseAdmin
      .from('agent_logs')
      .update(data)
      .eq('agent_type', 'email')
      .ilike('content', `%${emailId}%`)

    if (fallbackError) {
      console.error(`[Resend Webhook] Failed to update agent_log for email ${emailId}:`, fallbackError)
    }
  }
}
