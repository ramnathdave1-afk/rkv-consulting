import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';

const PROD_HOST = 'https://rkv-consulting.com';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unavailableTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">We're unable to take this call right now. Please try again later.</Say>
</Response>`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = (formData.get('From') as string) || '';
  const to = (formData.get('To') as string) || '';
  const callSid = (formData.get('CallSid') as string) || '';

  const supabase = createAdminClient();
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || PROD_HOST;

  let orgId: string | null = null;
  let orgName = 'RKV Consulting';

  if (to) {
    const { data: phoneRow } = await supabase
      .from('org_phone_numbers')
      .select('org_id, organizations(name)')
      .eq('phone_number', to)
      .eq('is_active', true)
      .maybeSingle();
    if (phoneRow?.org_id) {
      orgId = phoneRow.org_id;
      orgName = (phoneRow.organizations as unknown as { name?: string } | null)?.name || orgName;
    }
  }

  if (!orgId) {
    captureMessage('voice/incoming: no org for dialed number, refusing call', 'warning', { to, callSid });
    return new NextResponse(unavailableTwiml(), { headers: { 'Content-Type': 'text/xml' } });
  }

  const { data: conversation, error: convoErr } = await supabase
    .from('conversations')
    .insert({
      org_id: orgId,
      channel: 'voice',
      participant_phone: from,
      status: 'ai_handling',
      ai_context: { call_sid: callSid, direction: 'inbound', history: [] },
    })
    .select('id')
    .single();

  if (convoErr || !conversation) {
    captureException(convoErr, { route: 'twilio/voice/incoming', stage: 'conversation_insert', callSid });
    return new NextResponse(unavailableTwiml(), { headers: { 'Content-Type': 'text/xml' } });
  }
  const convoId = conversation.id;

  const greeting = `Hi, thank you for calling ${orgName}. I'm your AI assistant. How can I help you today?`;
  const noInput = "I didn't catch that. Please call back anytime. Goodbye.";
  const useElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const action = `${webhookBase}/api/twilio/voice/respond?convo=${convoId}`;

  const twiml = useElevenLabs
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${action}" method="POST" speechTimeout="2" language="en-US">
    <Play>${webhookBase}/api/voice/tts?text=${encodeURIComponent(greeting)}</Play>
  </Gather>
  <Play>${webhookBase}/api/voice/tts?text=${encodeURIComponent(noInput)}</Play>
</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${action}" method="POST" speechTimeout="2" language="en-US">
    <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
  </Gather>
  <Say voice="Polly.Joanna">${escapeXml(noInput)}</Say>
</Response>`;

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}
