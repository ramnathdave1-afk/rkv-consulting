import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/twilio/client';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();

  // Fetch conversation to determine channel and phone numbers
  const { data: conversation } = await supabase
    .from('conversations')
    .select('channel, participant_phone, twilio_phone')
    .eq('id', id)
    .single();

  const messageChannel = body.channel || conversation?.channel || 'sms';

  const { data, error } = await supabase
    .from('messages')
    .insert({
      content: body.content,
      channel: messageChannel,
      conversation_id: id,
      org_id: profile.org_id,
      direction: 'outbound',
      sender_type: 'staff',
      sender_id: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', id);

  // If SMS channel, send via Twilio
  let twilioResult = null;
  if (messageChannel === 'sms' && conversation?.participant_phone && conversation?.twilio_phone) {
    try {
      const smsResult = await sendSMS(
        conversation.participant_phone,
        conversation.twilio_phone,
        body.content
      );
      twilioResult = { sid: smsResult.sid, status: smsResult.status };

      // Update message with Twilio SID
      await supabase
        .from('messages')
        .update({ twilio_sid: smsResult.sid, status: smsResult.status })
        .eq('id', data.id);
    } catch (err) {
      twilioResult = { error: String(err) };
    }
  }

  return NextResponse.json({ message: data, twilio: twilioResult }, { status: 201 });
}
