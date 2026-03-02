import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    plaid: !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
    sendgrid: !!process.env.SENDGRID_API_KEY,
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    google_maps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
  });
}
