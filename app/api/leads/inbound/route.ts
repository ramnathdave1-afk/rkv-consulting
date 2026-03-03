import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/leads/inbound
 * Public endpoint — captures inbound leads from the homepage hero form.
 * Uses service role to bypass RLS (no auth required).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, portfolio_size, message, source } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'name and email are required' },
        { status: 400 }
      )
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error('[Leads Inbound] Supabase not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Insert as a contact with type 'lead' under a system/admin user,
    // or into a dedicated inbound_leads table. For now, store in metadata
    // on the notifications table for the first admin user, and also log it.
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (adminProfile) {
      await supabase.from('notifications').insert({
        user_id: adminProfile.id,
        type: 'inbound_lead',
        title: `New Lead: ${name}`,
        message: `${email}${portfolio_size ? ` | Portfolio: ${portfolio_size}` : ''}${message ? ` | "${message}"` : ''}`,
        data: { name, email, portfolio_size, message, source },
        read: false,
      })
    }

    console.log(`[Leads Inbound] New lead: ${name} <${email}> | source: ${source}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Leads Inbound] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit lead' },
      { status: 500 }
    )
  }
}
