import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('org_id', profile.org_id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account. Please subscribe first.' }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://meridian-node.vercel.app'}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
