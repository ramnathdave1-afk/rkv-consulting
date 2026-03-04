import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(req: NextRequest) {
  try {
    const { amount, tenantName, tenantEmail, propertyAddress, tenantId, propertyId, landlordUserId } = await req.json();

    if (!amount || !tenantId || !propertyId || !landlordUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: tenantEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rent Payment - ${propertyAddress || 'Property'}`,
              description: `Rent payment for ${tenantName || 'tenant'}`,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pay/canceled`,
      metadata: {
        type: 'rent_payment',
        tenant_id: tenantId,
        property_id: propertyId,
        landlord_user_id: landlordUserId,
        amount: String(amount),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Rent Checkout]', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
