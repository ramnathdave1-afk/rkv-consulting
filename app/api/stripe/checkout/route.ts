import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getPriceId } from '@/lib/billing/usage';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, full_name')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();
  const plan = body.plan || 'pro';
  const interval = body.interval || 'monthly';
  const priceId = getPriceId(plan, interval);

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan or price not configured' }, { status: 400 });
  }

  // Check for existing Stripe customer
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('org_id', profile.org_id)
    .single();

  let customerId = existingSub?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile.full_name || undefined,
      metadata: { org_id: profile.org_id, user_id: user.id },
    });
    customerId = customer.id;
  }

  const origin = request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/settings/billing?canceled=true`,
    subscription_data: {
      metadata: { org_id: profile.org_id },
      trial_period_days: 14,
    },
    metadata: { org_id: profile.org_id },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}

// GET handler for simple redirect from pricing page
export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan') || 'pro';
  const interval = request.nextUrl.searchParams.get('interval') || 'monthly';

  // If not authenticated, redirect to signup with plan context
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/signup?plan=${plan}&interval=${interval}`, request.nextUrl.origin),
    );
  }

  // If authenticated, create checkout session via POST logic
  const postReq = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ plan, interval }),
    headers: request.headers,
  });

  const response = await POST(postReq);
  const data = await response.json();

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.redirect(new URL('/settings/billing?error=checkout_failed', request.nextUrl.origin));
}
