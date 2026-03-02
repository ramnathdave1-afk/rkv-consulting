import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { PLANS, type PlanName } from '@/lib/stripe/plans'
import { generateSpeech } from '@/lib/apis/elevenlabs'
import { makeCall } from '@/lib/apis/twilio'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 503 })
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Elite plan for voice agents
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    if (!plan.features.voiceAgents) {
      return NextResponse.json(
        { error: 'Voice Agents require an Elite plan. Please upgrade to access this feature.' },
        { status: 403 }
      )
    }

    const { tenantId, purpose } = await req.json()

    if (!tenantId || !purpose) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, purpose' },
        { status: 400 }
      )
    }

    // Fetch tenant and property data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*, properties(*)')
      .eq('id', tenantId)
      .eq('user_id', user.id)
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

    // Fetch user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone, calling_hours_start, calling_hours_end')
      .eq('id', user.id)
      .single()

    // Check calling hours
    const now = new Date()
    const currentHour = now.getHours()
    const startHour = profile?.calling_hours_start ? parseInt(profile.calling_hours_start.split(':')[0]) : 9
    const endHour = profile?.calling_hours_end ? parseInt(profile.calling_hours_end.split(':')[0]) : 19

    if (currentHour < startHour || currentHour >= endHour) {
      return NextResponse.json(
        { error: `Calls can only be made during calling hours (${startHour}:00 - ${endHour}:00). Current time is outside this window.` },
        { status: 400 }
      )
    }

    const property = tenant.properties
    const managerName = profile?.full_name || 'Property Management'

    // Generate call script with Claude
    const purposeDescriptions: Record<string, string> = {
      late_rent: `a late rent reminder call. The tenant's rent of $${tenant.monthly_rent}/month is overdue. Be firm but professional. Mention the late fee of $${tenant.late_fee_amount || 50} and ask when they can make the payment. Offer payment plan options if needed.`,
      lease_renewal: `a lease renewal discussion call. The current lease ends on ${tenant.lease_end || 'N/A'}. Express appreciation and discuss renewal terms. Gauge their interest in renewing.`,
      maintenance_followup: `a maintenance follow-up call. Check if the recent maintenance work was satisfactory and if there are any other issues to address.`,
      welcome: `a welcome call for a new tenant. Welcome them to the property, confirm move-in details, and ask if they have any questions or needs.`,
      general: `a general property management call regarding their tenancy.`,
    }

    const purposePrompt = purposeDescriptions[purpose] || purposeDescriptions.general

    const systemPrompt = `You are an AI script writer for RKV Consulting's voice agent system. Generate a natural-sounding phone call script.

Return a JSON object with exactly these fields:
{
  "greeting": "Opening greeting (1-2 sentences)",
  "main_body": "The main content of the call (3-5 sentences, conversational tone)",
  "closing": "Professional closing (1-2 sentences)",
  "full_script": "The complete script as one continuous paragraph for text-to-speech"
}

Guidelines:
- Use a warm, professional tone
- Keep it concise (the full script should be under 200 words)
- Use the tenant's first name
- Identify yourself as calling from ${managerName}'s property management
- Include specific details (amounts, dates, property address)
- End with a clear call-to-action or next step
- Make it sound natural, not robotic

Respond ONLY with the JSON object, no markdown formatting.`

    const messages = [
      {
        role: 'user',
        content: `Generate a call script for ${purposePrompt}

Tenant details:
- Name: ${tenant.first_name} ${tenant.last_name}
- Phone: ${tenant.phone}
- Property: ${property?.address || 'N/A'}, ${property?.city || ''}, ${property?.state || ''}
- Monthly Rent: $${tenant.monthly_rent}
- Lease Start: ${tenant.lease_start || 'N/A'}
- Lease End: ${tenant.lease_end || 'N/A'}
- Status: ${tenant.status}`,
      },
    ]

    const scriptResponse = await callClaude(messages, systemPrompt)

    if (!scriptResponse || scriptResponse.error) {
      console.error('[Voice Agent] Claude error:', scriptResponse?.error)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      )
    }

    // Parse call script
    let script
    try {
      const content = scriptResponse.content?.[0]?.text || scriptResponse.content
      script = typeof content === 'string' ? JSON.parse(content) : content
    } catch (parseError) {
      console.error('[Voice Agent] Failed to parse script:', parseError)
      return NextResponse.json(
        { error: 'Failed to generate call script' },
        { status: 500 }
      )
    }

    // Generate speech with ElevenLabs
    const audioBuffer = await generateSpeech(script.full_script)

    if (!audioBuffer) {
      console.error('[Voice Agent] ElevenLabs speech generation failed')
      // Log failure
      await supabase.from('agent_logs').insert({
        user_id: user.id,
        tenant_id: tenantId,
        property_id: property?.id || null,
        agent_type: 'voice',
        trigger_event: purpose,
        content: script.full_script,
        status: 'failed',
        outcome: 'Speech generation failed',
      })

      return NextResponse.json(
        { error: 'Failed to generate speech audio' },
        { status: 500 }
      )
    }

    // Initiate call with Twilio using TwiML
    // For Twilio, we use TwiML <Say> as the primary delivery since storing/hosting
    // the audio buffer would require additional infrastructure. The ElevenLabs audio
    // can be used for voicemail or stored recordings.
    const twiml = `<Response><Say voice="Polly.Matthew">${script.full_script.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</Say></Response>`

    const callResult = await makeCall(tenant.phone, twiml)

    if (!callResult) {
      console.error('[Voice Agent] Twilio call initiation failed')
      await supabase.from('agent_logs').insert({
        user_id: user.id,
        tenant_id: tenantId,
        property_id: property?.id || null,
        agent_type: 'voice',
        trigger_event: purpose,
        content: script.full_script,
        status: 'failed',
        outcome: 'Call initiation failed',
      })

      return NextResponse.json(
        { error: 'Failed to initiate phone call' },
        { status: 500 }
      )
    }

    // Log to agent_logs table
    await supabase.from('agent_logs').insert({
      user_id: user.id,
      tenant_id: tenantId,
      property_id: property?.id || null,
      agent_type: 'voice',
      trigger_event: purpose,
      content: script.full_script,
      transcript: script.full_script,
      outcome: `Call initiated to ${tenant.phone}`,
      status: 'sent',
    })

    return NextResponse.json({
      success: true,
      callSid: callResult.sid,
      script: {
        greeting: script.greeting,
        main_body: script.main_body,
        closing: script.closing,
      },
    })
  } catch (error) {
    console.error('[Voice Agent] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process voice call request' },
      { status: 500 }
    )
  }
}
