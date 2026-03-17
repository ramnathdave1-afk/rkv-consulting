import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import { welcomeEmail } from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  const { email, name } = await request.json();

  if (!email || !name) {
    return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
  }

  const { subject, html } = welcomeEmail(name);
  const result = await sendEmail({ to: email, subject, html });

  if (!result.success) {
    return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
