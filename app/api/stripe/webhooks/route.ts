/**
 * Stripe webhook handler.
 *
 * NOTE: Public Stripe Checkout is disabled. Pricing is negotiated 1:1 with
 * customers and `organizations.plan_tier` is set manually by super-admins
 * (see `/api/admin/orgs/[id]/set-plan`). This webhook intentionally does NOT
 * mutate `plan_tier` anymore. It still:
 *
 *   - Tracks subscription state (status, period, cancel_at_period_end) on
 *     the `subscriptions` table so finance has accurate records when we
 *     issue manual invoices via Stripe.
 *   - Logs every event to `audit_logs` so we have a paper trail.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { captureException } from '@/lib/monitoring/sentry';
import { logAuditEvent } from '@/lib/audit/log-action';

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
  const item = subscription.items?.data?.[0];
  const raw = subscription as unknown as Record<string, unknown>;
  const start = item?.current_period_start ?? raw.current_period_start;
  const end = item?.current_period_end ?? raw.current_period_end;
  return {
    current_period_start: typeof start === 'number' ? new Date(start * 1000).toISOString() : null,
    current_period_end: typeof end === 'number' ? new Date(end * 1000).toISOString() : null,
  };
}

/**
 * Find the org_id associated with a Stripe customer id, if we have one. Used
 * only for audit logging — we don't mutate plan_tier here.
 */
async function findOrgIdForCustomer(
  supabase: ReturnType<typeof getServiceSupabase>,
  customerId: string | null | undefined,
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.id ?? null;
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
    captureException(err, { route: 'stripe/webhooks', stage: 'signature_verification' });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id ?? null;
        const subscriptionId = session.subscription as string | null;

        if (orgId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const period = extractPeriod(subscription);

          await supabase.from('subscriptions').upsert(
            {
              org_id: orgId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              status: subscription.status === 'trialing' ? 'trialing' : 'active',
              ...period,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'org_id' },
          );

          // Mirror customer id only — plan_tier is admin-managed.
          await supabase
            .from('organizations')
            .update({
              stripe_customer_id: session.customer as string,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orgId);

          await logAuditEvent({
            orgId,
            action: 'billing_update',
            resource_type: 'subscription',
            resource_id: subscriptionId,
            metadata: {
              source: 'stripe_webhook',
              event: event.type,
              stripe_customer_id: session.customer,
            },
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const period = extractPeriod(subscription);

        await supabase
          .from('subscriptions')
          .update({
            status:
              subscription.status === 'trialing'
                ? 'trialing'
                : subscription.cancel_at_period_end
                  ? 'active'
                  : subscription.status,
            ...period,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        const orgId = await findOrgIdForCustomer(supabase, subscription.customer as string);
        if (orgId) {
          await logAuditEvent({
            orgId,
            action: 'billing_update',
            resource_type: 'subscription',
            resource_id: subscription.id,
            metadata: {
              source: 'stripe_webhook',
              event: event.type,
              status: subscription.status,
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
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

        const orgId = await findOrgIdForCustomer(supabase, invoice.customer as string);
        if (orgId) {
          await logAuditEvent({
            orgId,
            action: 'billing_update',
            resource_type: 'subscription',
            resource_id: subscriptionId ?? invoice.id ?? null,
            metadata: {
              source: 'stripe_webhook',
              event: event.type,
              amount_paid: invoice.amount_paid,
              currency: invoice.currency,
            },
          });
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

        const orgId = await findOrgIdForCustomer(supabase, invoice.customer as string);
        if (orgId) {
          await logAuditEvent({
            orgId,
            action: 'billing_update',
            resource_type: 'subscription',
            resource_id: subscriptionId ?? invoice.id ?? null,
            metadata: {
              source: 'stripe_webhook',
              event: event.type,
              amount_due: invoice.amount_due,
              currency: invoice.currency,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        const orgId = await findOrgIdForCustomer(supabase, subscription.customer as string);
        if (orgId) {
          await logAuditEvent({
            orgId,
            action: 'billing_update',
            resource_type: 'subscription',
            resource_id: subscription.id,
            metadata: {
              source: 'stripe_webhook',
              event: event.type,
              note: 'Subscription canceled in Stripe; plan_tier left untouched (admin-managed).',
            },
          });
        }
        break;
      }
    }
  } catch (err) {
    captureException(err, { route: 'stripe/webhooks', stage: 'handler', event: event.type });
    // Still 200 so Stripe doesn't retry forever — error is captured.
  }

  return NextResponse.json({ received: true });
}
