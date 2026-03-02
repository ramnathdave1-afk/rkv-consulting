import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/claude'
import { PLANS, type PlanName } from '@/lib/stripe/plans'
import sgMail from '@sendgrid/mail'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json({ error: 'SendGrid API key not configured' }, { status: 503 })
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Elite plan for email agents
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    if (!plan.features.emailAgents) {
      return NextResponse.json(
        { error: 'Email Agents require an Elite plan. Please upgrade to access this feature.' },
        { status: 403 }
      )
    }

    const { tenantId, templateType, customContent } = await req.json()

    if (!tenantId || !templateType) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, templateType' },
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

    if (!tenant.email) {
      return NextResponse.json(
        { error: 'Tenant does not have an email address on file' },
        { status: 400 }
      )
    }

    // Fetch user profile for sender name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .single()

    const property = tenant.properties
    const senderName = profile?.full_name || 'Property Management'

    // Generate email content with Claude based on template type
    const templateDescriptions: Record<string, string> = {
      late_rent: `a professional but firm late rent notice. The tenant's rent of $${tenant.monthly_rent}/month was due on the ${tenant.rent_due_day || 1}st. Include the late fee amount of $${tenant.late_fee_amount || 50} and grace period of ${tenant.late_fee_grace_days || 5} days. Be polite but clear about consequences.`,
      lease_renewal: `a lease renewal offer. The current lease ends on ${tenant.lease_end || 'N/A'}. Express appreciation for the tenant and present renewal terms. Mention any rent adjustment if applicable.`,
      maintenance_update: `a maintenance update notification. Inform the tenant about the status of their maintenance request. Be professional and provide a timeline.`,
      welcome: `a warm welcome email for a new tenant moving into the property. Include move-in details, important contacts, and property rules/guidelines. Make them feel welcomed.`,
      move_out: `a move-out reminder and checklist. Include cleaning expectations, key return instructions, security deposit return timeline, and final inspection details.`,
      general: `a professional property management communication. ${customContent || 'General update to tenant.'}`,
    }

    const templatePrompt = templateDescriptions[templateType] || templateDescriptions.general

    const systemPrompt = `You are an AI email agent for RKV Consulting property management. Generate professional, well-formatted email content.

Return a JSON object with exactly these fields:
{
  "subject": "Email subject line",
  "html": "Full HTML email body with inline styles for professional formatting",
  "text": "Plain text version of the email"
}

Use a clean, professional email style with:
- Proper greeting using the tenant's first name
- Clear, organized content with proper paragraphs
- Professional closing with the property manager's name
- Contact information in the footer

The property manager's name is: ${senderName}
The property manager's phone is: ${profile?.phone || 'N/A'}
The property address is: ${property?.address || 'N/A'}, ${property?.city || ''}, ${property?.state || ''} ${property?.zip || ''}

Respond ONLY with the JSON object, no markdown formatting.`

    const messages = [
      {
        role: 'user',
        content: `Generate ${templatePrompt}

Tenant details:
- Name: ${tenant.first_name} ${tenant.last_name}
- Email: ${tenant.email}
- Monthly Rent: $${tenant.monthly_rent}
- Lease Start: ${tenant.lease_start || 'N/A'}
- Lease End: ${tenant.lease_end || 'N/A'}
- Status: ${tenant.status}

${customContent ? `Additional context: ${customContent}` : ''}`,
      },
    ]

    const response = await callClaude(messages, systemPrompt)

    if (!response || response.error) {
      console.error('[Email Agent] Claude error:', response?.error)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      )
    }

    // Parse email content
    let emailContent
    try {
      const content = response.content?.[0]?.text || response.content
      emailContent = typeof content === 'string' ? JSON.parse(content) : content
    } catch (parseError) {
      console.error('[Email Agent] Failed to parse Claude response:', parseError)
      return NextResponse.json(
        { error: 'Failed to generate email content' },
        { status: 500 }
      )
    }

    // Send via SendGrid
    const msg = {
      to: tenant.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@rkvconsulting.com',
        name: senderName,
      },
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    }

    let messageId: string | undefined

    try {
      const [sgResponse] = await sgMail.send(msg)
      messageId = sgResponse.headers['x-message-id']
    } catch (sendError) {
      console.error('[Email Agent] SendGrid error:', sendError)
      // Log the failed attempt
      await supabase.from('agent_logs').insert({
        user_id: user.id,
        tenant_id: tenantId,
        property_id: property?.id || null,
        agent_type: 'email',
        trigger_event: templateType,
        subject: emailContent.subject,
        content: emailContent.text,
        status: 'failed',
        outcome: 'Email send failed',
      })

      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Log to agent_logs table
    await supabase.from('agent_logs').insert({
      user_id: user.id,
      tenant_id: tenantId,
      property_id: property?.id || null,
      agent_type: 'email',
      trigger_event: templateType,
      subject: emailContent.subject,
      content: emailContent.text,
      outcome: `Email sent to ${tenant.email}`,
      status: 'sent',
    })

    return NextResponse.json({
      success: true,
      messageId,
      subject: emailContent.subject,
      recipient: tenant.email,
    })
  } catch (error) {
    console.error('[Email Agent] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process email request' },
      { status: 500 }
    )
  }
}
