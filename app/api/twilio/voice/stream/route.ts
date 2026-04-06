/**
 * Twilio Voice Stream Endpoint
 *
 * Returns TwiML that:
 *   1. Greets the caller with a short message
 *   2. Connects to the Voice AI Media Stream WebSocket
 *
 * The actual voice AI processing happens on the WebSocket server
 * (lib/voice-ai/ws-server.ts), not in this Next.js route.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  const formData = await request.formData();
  const to = formData.get('To') as string;
  const from = formData.get('From') as string;
  const callSid = formData.get('CallSid') as string;

  // Look up org by phone number
  let orgId = '';
  let orgName = 'RKV Consulting';
  let propertyId = '';

  try {
    const { data: orgPhone } = await supabase
      .from('org_phone_numbers')
      .select('org_id, property_id, organizations(name)')
      .eq('phone_number', to)
      .single();

    if (orgPhone) {
      orgId = orgPhone.org_id || '';
      orgName = (orgPhone.organizations as any)?.name || 'RKV Consulting';
      propertyId = orgPhone.property_id || '';
    }
  } catch {
    // If lookup fails, proceed with defaults
  }

  // Create conversation record
  let conversationId = '';
  try {
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        org_id: orgId || undefined,
        channel: 'voice',
        participant_phone: from,
        status: 'ai_handling',
        metadata: { call_sid: callSid, direction: 'inbound', voice_ai: true },
      })
      .select('id')
      .single();

    conversationId = conversation?.id || '';

    if (conversation) {
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        org_id: orgId || undefined,
        sender_type: 'system',
        content: `Inbound voice AI call from ${from}`,
        channel: 'voice',
        metadata: { call_sid: callSid, voice_ai: true },
      });
    }
  } catch {
    // If DB insert fails, continue — the call can still work
  }

  // WebSocket URL for the Voice AI server
  const wsUrl = process.env.VOICE_AI_WS_URL || 'wss://localhost:8080';

  // Return TwiML with <Connect><Stream> to open a Media Stream
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="orgId" value="${orgId}" />
      <Parameter name="orgName" value="${escapeXml(orgName)}" />
      <Parameter name="propertyId" value="${propertyId}" />
      <Parameter name="callerPhone" value="${from}" />
      <Parameter name="conversationId" value="${conversationId}" />
    </Stream>
  </Connect>
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
