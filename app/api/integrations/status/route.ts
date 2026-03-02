import { NextResponse } from 'next/server';

/**
 * Returns which env vars / API keys are set (values never exposed).
 * Use this to verify your Vercel env config: GET /api/integrations/status
 */
export async function GET() {
  return NextResponse.json({
    // Shown in Settings → Integrations
    plaid: !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET),
    sendgrid: !!process.env.SENDGRID_API_KEY,
    twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    google_maps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,

    // Full checklist (all keys the app uses)
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    rentcast: !!process.env.RENTCAST_API_KEY,
    attom: !!process.env.ATTOM_API_KEY,
    fred: !!process.env.FRED_API_KEY,
    rapidapi: !!process.env.RAPIDAPI_KEY,
    rapidapi_zillow_host: !!process.env.RAPIDAPI_ZILLOW_HOST,
    rapidapi_zillow_agent: !!process.env.RAPIDAPI_ZILLOW_AGENT,
    bls: !!process.env.BLS_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    cron_secret: !!process.env.CRON_SECRET,
    stripe_webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    stripe_prices:
      !!process.env.STRIPE_PRICE_BASIC_MONTHLY &&
      !!process.env.STRIPE_PRICE_PRO_MONTHLY &&
      !!process.env.STRIPE_PRICE_ELITE_MONTHLY,
    sendgrid_webhook: !!process.env.SENDGRID_WEBHOOK_KEY,
    twilio_webhook: !!process.env.TWILIO_AUTH_TOKEN,
    next_public_url: !!process.env.NEXT_PUBLIC_URL,
    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
