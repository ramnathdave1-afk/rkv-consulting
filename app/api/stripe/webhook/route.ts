import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { type PlanName } from '@/lib/stripe/plans'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Map Stripe price IDs to plan names
function getPlanNameFromPriceId(priceId: string): PlanName | null {
  const priceMap: Record<string, PlanName> = {}
  // Only add entries for env vars that are actually set
  const entries: [string | undefined, PlanName][] = [
    [process.env.STRIPE_PRICE_BASIC_MONTHLY, 'basic'],
    [process.env.STRIPE_PRICE_BASIC_ANNUAL, 'basic'],
    [process.env.STRIPE_PRICE_PRO_MONTHLY, 'pro'],
    [process.env.STRIPE_PRICE_PRO_ANNUAL, 'pro'],
    [process.env.STRIPE_PRICE_ELITE_MONTHLY, 'elite'],
    [process.env.STRIPE_PRICE_ELITE_ANNUAL, 'elite'],
  ]
  for (const [key, plan] of entries) {
    if (key) priceMap[key] = plan
  }
  return priceMap[priceId] || null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Checkout completed ─────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // ── Handle rent payments ──
        if (session.metadata?.type === 'rent_payment') {
          const tenantId = session.metadata.tenant_id
          const propertyId = session.metadata.property_id
          const landlordUserId = session.metadata.landlord_user_id
          const amount = Number(session.metadata.amount)

          if (tenantId && propertyId && landlordUserId && amount) {
            const supabase = getSupabaseAdmin()

            // Record rent payment
            await supabase.from('rent_payments').insert({
              user_id: landlordUserId,
              tenant_id: tenantId,
              property_id: propertyId,
              amount,
              payment_date: new Date().toISOString().slice(0, 10),
              status: 'paid',
              payment_method: 'stripe',
              stripe_payment_id: session.payment_intent as string || null,
            })

            // Record as transaction
            await supabase.from('transactions').insert({
              user_id: landlordUserId,
              property_id: propertyId,
              tenant_id: tenantId,
              type: 'income',
              category: 'rent',
              amount,
              date: new Date().toISOString().slice(0, 10),
              description: `Online rent payment via Stripe`,
              created_at: new Date().toISOString(),
            })

            // Notify landlord
            await supabase.from('notifications').insert({
              user_id: landlordUserId,
              type: 'success',
              title: 'Rent Payment Received',
              message: `A rent payment of $${amount.toLocaleString()} was received via Stripe.`,
              link: '/accounting',
              read: false,
            })
          }

          break
        }

        // ── Handle subscription checkouts ──
        const _customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const userId = session.metadata?.user_id
        const planName = session.metadata?.plan_name as PlanName

        if (!userId || !subscriptionId) {
          console.error('[Stripe Webhook] Missing user_id or subscription in checkout session')
          break
        }

        // Get full subscription details from Stripe
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId) as unknown as Record<string, unknown>

        const subItems = subscription.items as { data: Array<{ price?: { id?: string } }> }
        const periodStart = subscription.current_period_start as number
        const periodEnd = subscription.current_period_end as number
        const trialEnd = subscription.trial_end as number | null

        await getSupabaseAdmin().from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: subItems.data[0]?.price?.id || null,
            plan_name: planName,
            status: subscription.status as string,
            current_period_start: new Date(periodStart * 1000).toISOString(),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            trial_end: trialEnd
              ? new Date(trialEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end as boolean,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_subscription_id' }
        )

        break
      }

      // ── Subscription updated ───────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as Record<string, unknown>
        const subItemsData = sub.items as { data: Array<{ price?: { id?: string } }> }
        const priceId = subItemsData.data[0]?.price?.id
        const planName = priceId ? getPlanNameFromPriceId(priceId) : null
        const subPeriodStart = sub.current_period_start as number
        const subPeriodEnd = sub.current_period_end as number
        const subTrialEnd = sub.trial_end as number | null

        // Find the user by stripe_subscription_id
        const { data: existingSub } = await getSupabaseAdmin()
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id as string)
          .single()

        if (!existingSub) {
          console.error(
            '[Stripe Webhook] No subscription found for:',
            sub.id
          )
          break
        }

        await getSupabaseAdmin()
          .from('subscriptions')
          .update({
            plan_name: planName || undefined,
            stripe_price_id: priceId || undefined,
            status: sub.status as string,
            current_period_start: new Date(subPeriodStart * 1000).toISOString(),
            current_period_end: new Date(subPeriodEnd * 1000).toISOString(),
            trial_end: subTrialEnd
              ? new Date(subTrialEnd * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end as boolean,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id as string)

        break
      }

      // ── Subscription deleted (canceled) ────────────────────────
      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object as unknown as Record<string, unknown>

        await getSupabaseAdmin()
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', deletedSub.id as string)

        break
      }

      // ── Invoice payment failed ─────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as Record<string, unknown>
        const subscriptionId = invoice.subscription as string

        if (!subscriptionId) break

        // Set subscription status to past_due
        const { data: sub } = await getSupabaseAdmin()
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)
          .select('user_id')
          .single()

        // Insert notification for the user
        if (sub?.user_id) {
          await getSupabaseAdmin().from('notifications').insert({
            user_id: sub.user_id,
            type: 'warning',
            title: 'Payment Failed',
            message:
              'Your subscription payment failed. Please update your payment method to avoid service interruption.',
            link: '/settings',
            read: false,
          })
        }

        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
