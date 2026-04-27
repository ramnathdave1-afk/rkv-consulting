import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ''}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
