/**
 * Public: per-component uptime for the last 30 / 90 days.
 *
 * Aggregates `status_history` into daily buckets. Within each day we compute
 * `downtime_pct` = (# rows with status='down') / (# total rows). The bucket's
 * day-status is 'down' if downtime_pct > 5, 'degraded' if any non-operational
 * checks happened, else 'operational'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPONENTS = ['database', 'auth', 'email', 'sms', 'payments', 'ai'] as const;
type Component = (typeof COMPONENTS)[number];

interface Bucket {
  date: string;
  status: 'operational' | 'degraded' | 'down';
  downtime_pct: number;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`status-uptime:${ip}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const supabase = createAdminClient();
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from('status_history')
    .select('component, status, recorded_at')
    .gte('recorded_at', since90)
    .order('recorded_at', { ascending: true })
    .limit(100_000); // safe upper bound

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by component → date
  const byComp: Record<Component, Map<string, { total: number; down: number; degraded: number }>> = {
    database: new Map(),
    auth: new Map(),
    email: new Map(),
    sms: new Map(),
    payments: new Map(),
    ai: new Map(),
  };

  for (const row of rows ?? []) {
    const comp = row.component as Component;
    if (!byComp[comp]) continue;
    const date = (row.recorded_at as string).slice(0, 10);
    const cur = byComp[comp].get(date) ?? { total: 0, down: 0, degraded: 0 };
    cur.total++;
    if (row.status === 'down') cur.down++;
    else if (row.status === 'degraded') cur.degraded++;
    byComp[comp].set(date, cur);
  }

  // Build last 30/90 day arrays
  function lastNDates(n: number): string[] {
    const out: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }
  const dates30 = lastNDates(30);
  const dates90 = lastNDates(90);

  function bucketFor(comp: Component, date: string): Bucket {
    const agg = byComp[comp].get(date);
    if (!agg || agg.total === 0) {
      return { date, status: 'operational', downtime_pct: 0 };
    }
    const downtime_pct = (agg.down / agg.total) * 100;
    const status: Bucket['status'] =
      downtime_pct > 5 ? 'down' : agg.down + agg.degraded > 0 ? 'degraded' : 'operational';
    return { date, status, downtime_pct: Number(downtime_pct.toFixed(2)) };
  }

  const components: Record<Component, Bucket[]> = {} as Record<Component, Bucket[]>;
  const uptime_30d: Record<Component, number> = {} as Record<Component, number>;
  const uptime_90d: Record<Component, number> = {} as Record<Component, number>;

  for (const comp of COMPONENTS) {
    const b30 = dates30.map((d) => bucketFor(comp, d));
    components[comp] = b30;

    const sumDowntime30 = b30.reduce((s, b) => s + b.downtime_pct, 0);
    uptime_30d[comp] = Number((100 - sumDowntime30 / b30.length).toFixed(2));

    const b90 = dates90.map((d) => bucketFor(comp, d));
    const sumDowntime90 = b90.reduce((s, b) => s + b.downtime_pct, 0);
    uptime_90d[comp] = Number((100 - sumDowntime90 / b90.length).toFixed(2));
  }

  return NextResponse.json(
    { components, uptime_30d, uptime_90d },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' } },
  );
}
