import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendSMS } from '@/lib/twilio/client';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, from, body } = await request.json();

  if (!to || !from || !body) {
    return NextResponse.json({ error: 'Missing to, from, or body' }, { status: 400 });
  }

  try {
    const result = await sendSMS(to, from, body);
    return NextResponse.json({ sid: result.sid, status: result.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
