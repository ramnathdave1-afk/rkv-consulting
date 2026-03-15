import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, full_name, company } = body;

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from('waitlist').insert({
    email,
    full_name,
    company: company || null,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email is already on the waitlist' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
