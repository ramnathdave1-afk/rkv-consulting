import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get('From') as string;
  const callSid = formData.get('CallSid') as string;

  const supabase = createAdminClient();
  const webhookBase = process.env.TWILIO_WEBHOOK_BASE_URL || 'https://rkv-consulting.vercel.app';

  // Create conversation for this call
  const { data: conversation } = await supabase.from('conversations').insert({
    org_id: ORG_ID,
    channel: 'voice',
    participant_phone: from,
    status: 'ai_handling',
    ai_context: { call_sid: callSid, direction: 'inbound', history: [] },
  }).select('id').single();

  const convoId = conversation?.id || '';

  // Greeting + first <Gather> to listen for caller speech
  const greeting = "Hi, thank you for calling RKV Consulting. I'm your AI property management assistant. How can I help you today?";
  const noInput = "I didn't catch that. Please call back anytime. Goodbye.";
  const useElevenLabs = !!process.env.ELEVENLABS_API_KEY;

  let twiml: string;
  if (useElevenLabs) {
    const greetUrl = `${webhookBase}/api/voice/tts?text=${encodeURIComponent(greeting)}`;
    const noInputUrl = `${webhookBase}/api/voice/tts?text=${encodeURIComponent(noInput)}`;
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${webhookBase}/api/twilio/voice/respond?convo=${convoId}" method="POST" speechTimeout="2" language="en-US">
    <Play>${greetUrl}</Play>
  </Gather>
  <Play>${noInputUrl}</Play>
</Response>`;
  } else {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${webhookBase}/api/twilio/voice/respond?convo=${convoId}" method="POST" speechTimeout="2" language="en-US">
    <Say voice="Polly.Joanna">${greeting}</Say>
  </Gather>
  <Say voice="Polly.Joanna">${noInput}</Say>
</Response>`;
  }

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}
