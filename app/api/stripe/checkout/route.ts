import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
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

    const { priceId, planName, annual: _annual } = await req.json()

    if (!priceId || !planName) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId, planName' },
        { status: 400 }
      )
    }

    // Look up or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: profile?.email || user.email!,
        name: profile?.full_name || undefined,
        metadata: {
          user_id: user.id,
        },
      })

      customerId = customer.id

      // Save stripe_customer_id to profiles
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      subscription_data: {
        trial_period_days: 14,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/onboarding?welcome=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
      metadata: {
        user_id: user.id,
        plan_name: planName,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
