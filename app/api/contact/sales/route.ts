/**
 * Public sales inquiry endpoint — backs the "Talk to Sales" form on the
 * pricing page. Writes to `sales_inquiries` and notifies the sales team.
 *
 * Rate-limited to 10 req/min per IP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { captureException } from '@/lib/monitoring/sentry';

export const runtime = 'nodejs';

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().max(200).optional().or(z.literal('')),
  portfolio_size: z
    .enum(['50-100', '100-500', '500-2000', '2000+', ''])
    .optional()
    .or(z.literal('')),
  current_software: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(1).max(4000),
});

const SALES_NOTIFY_EMAIL = process.env.SALES_NOTIFY_EMAIL || 'dave@rkv-consulting.com';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, resetAt } = checkRateLimit(`contact-sales:${ip}`, 10, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in a minute.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.format() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from('sales_inquiries')
    .insert({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      company: data.company?.trim() || null,
      portfolio_size: data.portfolio_size || null,
      current_software: data.current_software?.trim() || null,
      message: data.message.trim(),
      status: 'new',
      source: 'pricing_page',
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || null,
    })
    .select('id')
    .single();

  if (error) {
    captureException(error, { route: 'contact/sales', stage: 'insert' });
    return NextResponse.json({ error: 'Could not save inquiry' }, { status: 500 });
  }

  // Fire-and-forget email — don't fail the request if email fails.
  try {
    await sendEmail({
      to: SALES_NOTIFY_EMAIL,
      subject: `[Sales Inquiry] ${data.name}${data.company ? ` (${data.company})` : ''}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #06080C; color: #F0F2F5; padding: 32px; border-radius: 12px;">
          <h2 style="color: #00D4AA; margin: 0 0 16px;">New sales inquiry</h2>
          <table style="width:100%; font-size:14px; border-collapse:collapse;">
            <tr><td style="padding:4px 0; color:#8A95A5; width:140px;">Name</td><td>${escapeHtml(data.name)}</td></tr>
            <tr><td style="padding:4px 0; color:#8A95A5;">Email</td><td><a href="mailto:${escapeHtml(data.email)}" style="color:#00D4AA;">${escapeHtml(data.email)}</a></td></tr>
            <tr><td style="padding:4px 0; color:#8A95A5;">Company</td><td>${escapeHtml(data.company || '—')}</td></tr>
            <tr><td style="padding:4px 0; color:#8A95A5;">Portfolio</td><td>${escapeHtml(data.portfolio_size || '—')} units</td></tr>
            <tr><td style="padding:4px 0; color:#8A95A5;">Current software</td><td>${escapeHtml(data.current_software || '—')}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0;" />
          <p style="margin: 0 0 8px; color:#8A95A5; font-size:12px;">What they want to solve</p>
          <p style="margin: 0; white-space: pre-wrap; font-size:14px;">${escapeHtml(data.message)}</p>
          <p style="margin-top: 24px; font-size:11px; color:#5A6573;">Inquiry ID: ${row?.id ?? 'unknown'}</p>
        </div>
      `,
    });
  } catch (err) {
    captureException(err, { route: 'contact/sales', stage: 'email' });
  }

  return NextResponse.json({ ok: true, id: row?.id });
}
