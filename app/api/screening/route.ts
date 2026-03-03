import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// ── Route Handlers ───────────────────────────────────────────────────────────

/**
 * POST /api/screening
 * Creates a new screening application with a unique token and shareable link.
 */
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
    const { property_id } = body

    if (!property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      )
    }

    // Generate a unique token for this screening application
    const token = crypto.randomUUID()

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: application, error } = await supabase
      .from('screening_applications')
      .insert({
        user_id: user.id,
        property_id: property_id || null,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Screening] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create screening application' },
        { status: 500 }
      )
    }

    // Build the shareable application link
    const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const applicationLink = `${baseUrl}/apply/${token}`

    return NextResponse.json({
      application: {
        ...application,
        link: applicationLink,
      },
    })
  } catch (error) {
    console.error('[Screening] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create screening application' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/screening
 * Lists all screening applications for the authenticated user.
 */
export async function GET() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: applications, error } = await supabase
      .from('screening_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Screening] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch screening applications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ applications: applications || [] })
  } catch (error) {
    console.error('[Screening] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screening applications' },
      { status: 500 }
    )
  }
}
