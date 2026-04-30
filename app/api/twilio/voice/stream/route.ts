/**
 * Twilio Voice Stream Endpoint — DEPRECATED.
 *
 * This route used to return TwiML opening a Twilio Media Stream WebSocket
 * to a standalone Voice AI server (Deepgram + ElevenLabs + Claude). That
 * server was never deployed and Vercel cannot host long-running WebSocket
 * processes anyway, so the pipeline was dead in production.
 *
 * Consolidated on the Twilio <Gather> pipeline at /api/twilio/voice/incoming
 * (HTTP-based, runs on Vercel, currently working). This route now redirects
 * incoming Twilio calls to /incoming so any phone number config pointing
 * at /stream keeps working.
 *
 * To restore real-time interruption-handling Voice AI in the future, see
 * git history before this commit (lib/voice-ai/, scripts/voice-server.ts)
 * or rebuild fresh against a VPS-hosted WebSocket server.
 */

import { NextResponse } from 'next/server';

const PROD_HOST = 'https://rkv-consulting.com';

export async function POST() {
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || PROD_HOST;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${webhookBase}/api/twilio/voice/incoming</Redirect>
</Response>`;
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}
