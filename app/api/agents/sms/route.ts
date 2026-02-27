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
    const { tenantId, message, automated } = body

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
      .select('id, name, phone')
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
        action: 'send_sms',
        status: 'failed',
        metadata: {
          tenant_id: tenantId,
          tenant_name: tenant.name,
          automated: automated || false,
          error: 'Twilio API call failed',
        },
        created_at: new Date().toISOString(),
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
      action: 'send_sms',
      status: 'success',
      metadata: {
        tenant_id: tenantId,
        tenant_name: tenant.name,
        message_sid: smsResult.sid,
        to: smsResult.to,
        from: smsResult.from,
        automated: automated || false,
      },
      created_at: new Date().toISOString(),
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
