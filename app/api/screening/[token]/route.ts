import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Route Handlers (public — no auth required) ──────────────────────────────

/**
 * GET /api/screening/[token]
 * Returns the screening application details by token.
 * Public endpoint — no authentication required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data: application, error } = await supabase
      .from('screening_applications')
      .select('id, property_id, status, expires_at, created_at')
      .eq('token', token)
      .single()

    if (error || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Check if the application has expired
    if (application.expires_at && new Date(application.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This application link has expired' },
        { status: 410 }
      )
    }

    // Check if already submitted
    if (application.status === 'submitted') {
      return NextResponse.json(
        { error: 'This application has already been submitted' },
        { status: 409 }
      )
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error('[Screening Token] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/screening/[token]
 * Submits applicant data for a screening application.
 * Public endpoint — no authentication required.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Verify the token exists and is still valid
    const { data: existing, error: fetchError } = await supabase
      .from('screening_applications')
      .select('id, status, expires_at')
      .eq('token', token)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Check expiration
    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This application link has expired' },
        { status: 410 }
      )
    }

    // Check if already submitted
    if (existing.status === 'submitted') {
      return NextResponse.json(
        { error: 'This application has already been submitted' },
        { status: 409 }
      )
    }

    const body = await req.json()
    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      ssn_last4: _ssn_last4,
      current_address,
      current_employer,
      annual_income,
      move_in_date,
      num_occupants,
      pets,
      references: _references,
      additional_info: _additional_info,
    } = body

    // Basic validation
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'first_name, last_name, and email are required' },
        { status: 400 }
      )
    }

    // Update the application with applicant data
    const { data: updated, error: updateError } = await supabase
      .from('screening_applications')
      .update({
        status: 'submitted',
        applicant_name: `${first_name} ${last_name}`,
        applicant_email: email,
        applicant_phone: phone || null,
        date_of_birth: date_of_birth || null,
        current_address: current_address || null,
        employer: current_employer || null,
        monthly_income: annual_income ? parseFloat(annual_income) / 12 : null,
        move_in_date: move_in_date || null,
        number_of_occupants: num_occupants ? parseInt(num_occupants) : null,
        pets: !!pets,
        updated_at: new Date().toISOString(),
      })
      .eq('token', token)
      .select('id, status')
      .single()

    if (updateError) {
      console.error('[Screening Token] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Application submitted successfully',
      application: updated,
    })
  } catch (error) {
    console.error('[Screening Token] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
