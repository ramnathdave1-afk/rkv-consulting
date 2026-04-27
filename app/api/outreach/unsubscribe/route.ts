import { NextRequest, NextResponse } from 'next/server';
import { query, ORG_ID } from '@/lib/outreach/db';

async function recordUnsubscribe(email: string, source: string): Promise<void> {
  if (!email) return;
  await query(
    `INSERT INTO outreach_unsubscribes (org_id, email, source, unsubscribed_at)
     VALUES ($1, lower($2), $3, NOW())
     ON CONFLICT (org_id, email) DO NOTHING`,
    [ORG_ID, email, source]
  );
}

function htmlConfirmation(email: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:48px;text-align:center;">
    <h2>You're unsubscribed</h2>
    <p>${email} has been removed from our outreach list.</p>
    <p style="color:#666;">If this was a mistake, just reply to any prior email and we'll resubscribe you.</p>
  </body></html>`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim();
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }
  await recordUnsubscribe(email, 'link');
  return new NextResponse(htmlConfirmation(email), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  let email = (url.searchParams.get('email') || '').trim();
  if (!email) {
    try {
      const body = await request.json();
      email = (body?.email || '').trim();
    } catch {
      // ignore
    }
  }
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }
  await recordUnsubscribe(email, 'one-click');
  return NextResponse.json({ ok: true });
}
