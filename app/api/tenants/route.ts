import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type PlanName } from '@/lib/stripe/plans'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const propertyId = searchParams.get('property_id')

    let query = supabase
      .from('tenants')
      .select('*, properties(id, address, city, state, zip, property_type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data: tenants, error } = await query

    if (error) {
      console.error('[Tenants GET] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tenants' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tenants: tenants || [] })
  } catch (error) {
    console.error('[Tenants GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription for tenant limit
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    // Count existing tenants
    const { count } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const tenantLimit = plan.features.tenantLimit as number
    const currentCount = count || 0

    if (tenantLimit !== Infinity && currentCount >= tenantLimit) {
      return NextResponse.json(
        {
          error: `You have reached your tenant limit (${tenantLimit} tenants on the ${plan.name} plan). Upgrade to add more tenants.`,
          currentCount,
          limit: tenantLimit,
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    if (!body.property_id) {
      return NextResponse.json(
        { error: 'property_id is required' },
        { status: 400 }
      )
    }

    if (!body.first_name || !body.last_name) {
      return NextResponse.json(
        { error: 'first_name and last_name are required' },
        { status: 400 }
      )
    }

    // Verify the property belongs to the user
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', body.property_id)
      .eq('user_id', user.id)
      .single()

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found or does not belong to you' },
        { status: 404 }
      )
    }

    const tenantData = {
      user_id: user.id,
      property_id: body.property_id,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || null,
      phone: body.phone || null,
      date_of_birth: body.date_of_birth || null,
      emergency_contact_name: body.emergency_contact_name || null,
      emergency_contact_phone: body.emergency_contact_phone || null,
      emergency_contact_relation: body.emergency_contact_relation || null,
      vehicle_make: body.vehicle_make || null,
      vehicle_model: body.vehicle_model || null,
      vehicle_plate: body.vehicle_plate || null,
      lease_start: body.lease_start || null,
      lease_end: body.lease_end || null,
      monthly_rent: body.monthly_rent || 0,
      security_deposit: body.security_deposit || null,
      deposit_held: body.deposit_held || null,
      rent_due_day: body.rent_due_day || 1,
      late_fee_amount: body.late_fee_amount || 50,
      late_fee_grace_days: body.late_fee_grace_days || 5,
      payment_method: body.payment_method || null,
      status: body.status || 'active',
      notes: body.notes || null,
      renters_insurance_provider: body.renters_insurance_provider || null,
      renters_insurance_policy: body.renters_insurance_policy || null,
      renters_insurance_expiry: body.renters_insurance_expiry || null,
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert(tenantData)
      .select('*, properties(id, address, city, state, zip, property_type)')
      .single()

    if (error) {
      console.error('[Tenants POST] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('[Tenants POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
