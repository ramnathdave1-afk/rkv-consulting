import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateRequest } from '@/lib/twilio/client';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = Object.fromEntries(new URLSearchParams(body));

  // Validate Twilio signature
  const signature = request.headers.get('x-twilio-signature') || '';
  const url = `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/twilio/status`;

  if (!validateRequest(signature, url, params)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const { MessageSid: messageSid, MessageStatus: status } = params;

  if (messageSid && status) {
    const supabase = createAdminClient();
    await supabase
      .from('messages')
      .update({ status })
      .eq('twilio_sid', messageSid);
  }

  return NextResponse.json({ success: true });
}
