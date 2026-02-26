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
    const type = searchParams.get('type')

    let query = supabase
      .from('properties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('property_type', type)
    }

    const { data: properties, error } = await query

    if (error) {
      console.error('[Properties GET] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch properties' },
        { status: 500 }
      )
    }

    return NextResponse.json({ properties: properties || [] })
  } catch (error) {
    console.error('[Properties GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
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

    // Check subscription for property limit
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_name, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    const planName = (subscription?.plan_name || 'basic') as PlanName
    const plan = PLANS[planName]

    // Count existing properties
    const { count } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const propertyLimit = plan.features.propertyLimit as number
    const currentCount = count || 0

    if (propertyLimit !== Infinity && currentCount >= propertyLimit) {
      return NextResponse.json(
        {
          error: `You have reached your property limit (${propertyLimit} properties on the ${plan.name} plan). Upgrade to add more properties.`,
          currentCount,
          limit: propertyLimit,
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    if (!body.address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    const propertyData = {
      user_id: user.id,
      address: body.address,
      unit: body.unit || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      lat: body.lat || null,
      lng: body.lng || null,
      property_type: body.property_type || null,
      status: body.status || 'active',
      purchase_price: body.purchase_price || null,
      purchase_date: body.purchase_date || null,
      current_value: body.current_value || null,
      bedrooms: body.bedrooms || null,
      bathrooms: body.bathrooms || null,
      sqft: body.sqft || null,
      year_built: body.year_built || null,
      mortgage_balance: body.mortgage_balance || null,
      mortgage_rate: body.mortgage_rate || null,
      mortgage_payment: body.mortgage_payment || null,
      mortgage_lender: body.mortgage_lender || null,
      mortgage_maturity_date: body.mortgage_maturity_date || null,
      insurance_annual: body.insurance_annual || null,
      insurance_provider: body.insurance_provider || null,
      insurance_policy_number: body.insurance_policy_number || null,
      insurance_expiry: body.insurance_expiry || null,
      tax_annual: body.tax_annual || null,
      hoa_monthly: body.hoa_monthly || null,
      notes: body.notes || null,
      images: body.images || [],
    }

    const { data: property, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single()

    if (error) {
      console.error('[Properties POST] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create property' },
        { status: 500 }
      )
    }

    return NextResponse.json({ property }, { status: 201 })
  } catch (error) {
    console.error('[Properties POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}
