import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, resetAt } = checkRateLimit(`contact:${ip}`, 10, 60_000); // 10 req/min/IP

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const { name, email, message } = await request.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }

  await sendEmail({
    to: 'hello@rkvconsulting.com',
    subject: `[Contact] ${name} — ${email}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; background: #06080C; color: #F0F2F5; padding: 32px; border-radius: 12px;">
        <h2 style="color: #00D4AA; margin: 0 0 16px;">New Contact Form Submission</h2>
        <p style="margin: 0 0 8px;"><strong>Name:</strong> ${name}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0;" />
        <p style="margin: 0; white-space: pre-wrap;">${message}</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
