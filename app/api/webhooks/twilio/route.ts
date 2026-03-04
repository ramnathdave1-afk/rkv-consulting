import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

// ── Supabase Admin Client (bypasses RLS for webhook processing) ─────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Twilio Signature Validation ─────────────────────────────────────────────

function validateTwilioSignature(
  req: NextRequest,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.error('[Twilio Webhook] TWILIO_AUTH_TOKEN not set — rejecting webhook')
    return false
  }

  const signature = req.headers.get('x-twilio-signature')
  if (!signature) {
    console.error('[Twilio Webhook] Missing x-twilio-signature header')
    return false
  }

  // Build the full URL Twilio used to reach us
  const url = req.url

  // Sort parameters alphabetically and concatenate key+value pairs
  const sortedKeys = Object.keys(params).sort()
  const dataString = sortedKeys.reduce((acc, key) => acc + key + params[key], url)

  // Compute HMAC-SHA1 and compare
  const computed = crypto
    .createHmac('sha1', authToken)
    .update(dataString)
    .digest('base64')

  return computed === signature
}

// ── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const params: Record<string, string> = {}
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    // Validate Twilio signature
    if (!validateTwilioSignature(req, params)) {
      console.error('[Twilio Webhook] Invalid signature')
      // Still return 200 to avoid Twilio retries, but log the error
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // ── Handle Call Status Callbacks ──────────────────────────────────

    const callStatus = params.CallStatus
    const callSid = params.CallSid

    if (callStatus && callSid) {
      console.log(`[Twilio Webhook] Call ${callSid}: status=${callStatus}`)

      const updateData: Record<string, unknown> = {
        status: mapCallStatus(callStatus),
      }

      // Include call duration if present
      if (params.CallDuration) {
        updateData.call_duration_seconds = parseInt(params.CallDuration, 10)
      }

      // Include outcome details
      const outcomeMessages: Record<string, string> = {
        completed: `Call completed (${params.CallDuration || '0'}s)`,
        busy: 'Call ended: line was busy',
        'no-answer': 'Call ended: no answer',
        failed: `Call failed${params.SipResponseCode ? ` (SIP ${params.SipResponseCode})` : ''}`,
        canceled: 'Call was canceled',
        ringing: 'Call is ringing',
        'in-progress': 'Call in progress',
        queued: 'Call queued',
      }

      if (outcomeMessages[callStatus]) {
        updateData.outcome = outcomeMessages[callStatus]
      }

      // Find and update the agent_log entry by matching the call SID in the outcome field
      // The voice agent stores "Call initiated to <phone>" with the SID returned
      const { error: updateError } = await supabaseAdmin
        .from('agent_logs')
        .update(updateData)
        .eq('agent_type', 'voice')
        .ilike('outcome', `%${callSid}%`)

      if (updateError) {
        // Fallback: try matching by content/trigger since the SID might be stored differently
        console.warn('[Twilio Webhook] Could not match call SID in outcome, trying fallback')

        // If we have the Called (To) number, try matching recent voice logs to that number
        if (params.Called || params.To) {
          const phoneNumber = params.Called || params.To
          const { error: fallbackError } = await supabaseAdmin
            .from('agent_logs')
            .update(updateData)
            .eq('agent_type', 'voice')
            .eq('status', 'sent')
            .ilike('outcome', `%${phoneNumber}%`)
            .order('created_at', { ascending: false })
            .limit(1)

          if (fallbackError) {
            console.error('[Twilio Webhook] Failed to update agent_log:', fallbackError)
          }
        }
      }
    }

    // ── Handle Message Status Callbacks ───────────────────────────────

    const messageStatus = params.MessageStatus
    const messageSid = params.MessageSid

    if (messageStatus && messageSid) {
      console.log(`[Twilio Webhook] Message ${messageSid}: status=${messageStatus}`)

      const smsUpdate: Record<string, unknown> = {
        status: mapMessageStatus(messageStatus),
      }

      if (['delivered', 'sent'].includes(messageStatus)) {
        smsUpdate.outcome = `SMS ${messageStatus}`
      } else if (['undelivered', 'failed'].includes(messageStatus)) {
        smsUpdate.outcome = `SMS ${messageStatus}${params.ErrorCode ? ` (error ${params.ErrorCode}: ${params.ErrorMessage || 'unknown'})` : ''}`
      }

      // Match the agent_log by the message SID stored in metadata
      const { error: smsError } = await supabaseAdmin
        .from('agent_logs')
        .update(smsUpdate)
        .eq('agent_type', 'sms')
        .ilike('outcome', `%${messageSid}%`)

      if (smsError) {
        console.error('[Twilio Webhook] Failed to update SMS agent_log:', smsError)
      }
    }

    // ── Handle Recording Callbacks ───────────────────────────────────

    const recordingUrl = params.RecordingUrl
    const recordingCallSid = params.CallSid

    if (recordingUrl && recordingCallSid) {
      console.log(`[Twilio Webhook] Recording for call ${recordingCallSid}: ${recordingUrl}`)

      const { error: recordingError } = await supabaseAdmin
        .from('agent_logs')
        .update({
          recording_url: recordingUrl,
        })
        .eq('agent_type', 'voice')
        .ilike('outcome', `%${recordingCallSid}%`)

      if (recordingError) {
        console.error('[Twilio Webhook] Failed to update recording URL:', recordingError)
      }
    }

    // Always return 200 OK quickly (Twilio requires fast responses)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Twilio Webhook] Unhandled error:', error)
    // Return 200 even on error to prevent Twilio from retrying
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// ── Status Mappers ──────────────────────────────────────────────────────────

function mapCallStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    completed: 'completed',
    busy: 'failed',
    'no-answer': 'failed',
    failed: 'failed',
    canceled: 'failed',
    ringing: 'sent',
    'in-progress': 'sent',
    queued: 'queued',
  }
  return statusMap[twilioStatus] || 'sent'
}

function mapMessageStatus(twilioStatus: string): string {
  const statusMap: Record<string, string> = {
    queued: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    undelivered: 'failed',
    failed: 'failed',
  }
  return statusMap[twilioStatus] || 'sent'
}
