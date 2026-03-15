import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Extract period dates from subscription (handles varying Stripe API shapes). */
function extractPeriod(subscription: Stripe.Subscription) {
  // In newer Stripe versions, period is on individual items
  const item = subscription.items?.data?.[0];
  const raw = subscription as unknown as Record<string, unknown>;
  const start = item?.current_period_start ?? raw.current_period_start;
  const end = item?.current_period_end ?? raw.current_period_end;
  return {
    current_period_start: typeof start === 'number' ? new Date(start * 1000).toISOString() : null,
    current_period_end: typeof end === 'number' ? new Date(end * 1000).toISOString() : null,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      const subscriptionId = session.subscription as string;

      if (orgId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const plan = determinePlan(subscription);
        const period = extractPeriod(subscription);

        await supabase
          .from('subscriptions')
          .upsert({
            org_id: orgId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            plan,
            status: subscription.status === 'trialing' ? 'trialing' : 'active',
            ...period,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'org_id' });

        await supabase.from('agent_activity_log').insert({
          agent_name: 'system',
          action: `Subscription activated: ${plan} plan`,
          details: { org_id: orgId, plan, subscription_id: subscriptionId },
        });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subDetails = invoice.parent?.subscription_details;
      const subscriptionId = subDetails?.subscription as string | undefined;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const period = extractPeriod(subscription);

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            ...period,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subDetails = invoice.parent?.subscription_details;
      const subscriptionId = subDetails?.subscription as string | undefined;

      if (subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscriptionId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', plan: 'explorer', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const plan = determinePlan(subscription);
      const period = extractPeriod(subscription);

      await supabase
        .from('subscriptions')
        .update({
          plan,
          status: subscription.status === 'trialing' ? 'trialing' : subscription.cancel_at_period_end ? 'active' : subscription.status,
          current_period_end: period.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

function determinePlan(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price.id;
  const proMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const entMonthly = process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID;
  const entAnnual = process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID;

  if (priceId === proMonthly || priceId === proAnnual) return 'pro';
  if (priceId === entMonthly || priceId === entAnnual) return 'enterprise';
  return 'pro';
}
