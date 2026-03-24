import { NextResponse } from 'next/server';
import { generateVoiceGreeting } from '@/lib/twilio/voice';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const formData = await request.formData();
  const to = formData.get('To') as string;
  const from = formData.get('From') as string;
  const callSid = formData.get('CallSid') as string;

  // Look up org by phone number
  const { data: orgPhone } = await supabase
    .from('org_phone_numbers')
    .select('org_id, organizations(name)')
    .eq('phone_number', to)
    .single();

  const orgName = (orgPhone?.organizations as any)?.name || 'MeridianNode';
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://meridian-node.vercel.app';

  // Create conversation record for this call
  const { data: conversation } = await supabase.from('conversations').insert({
    org_id: orgPhone?.org_id,
    channel: 'voice',
    participant_phone: from,
    status: 'ai_handling',
    metadata: { call_sid: callSid, direction: 'inbound' },
  }).select('id').single();

  // Log inbound call
  if (conversation) {
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      org_id: orgPhone?.org_id,
      sender_type: 'system',
      content: `Inbound voice call from ${from}`,
      channel: 'voice',
      metadata: { call_sid: callSid },
    });
  }

  const twiml = generateVoiceGreeting(orgName, webhookBase);

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}
