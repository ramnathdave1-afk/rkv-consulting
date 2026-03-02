import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/apis/twilio'

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
    const { tenantId, message, automated: _automated } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    // Fetch tenant phone number from Supabase
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, first_name, last_name, phone, property_id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    if (!tenant.phone) {
      return NextResponse.json(
        { error: 'Tenant does not have a phone number on file' },
        { status: 400 }
      )
    }

    // Send SMS via Twilio
    const smsResult = await sendSMS(tenant.phone, message)

    if (!smsResult) {
      // Log the failed attempt
      await supabase.from('agent_logs').insert({
        user_id: user.id,
        agent_type: 'sms',
        tenant_id: tenantId,
        property_id: tenant.property_id || null,
        trigger_event: 'sms_sent',
        content: message,
        outcome: 'Failed to send',
        status: 'failed',
      })

      return NextResponse.json(
        { error: 'Failed to send SMS. Please check Twilio configuration.' },
        { status: 502 }
      )
    }

    // Log the successful SMS to agent_logs
    await supabase.from('agent_logs').insert({
      user_id: user.id,
      agent_type: 'sms',
      tenant_id: tenantId,
      property_id: tenant.property_id || null,
      trigger_event: 'sms_sent',
      content: message,
      outcome: `Delivered to ${tenant.phone}`,
      status: 'sent',
    })

    return NextResponse.json({
      success: true,
      messageId: smsResult.sid,
    })
  } catch (error) {
    console.error('[Agents SMS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    )
  }
}
