/**
 * Public health-check endpoint for the status page.
 *
 * Exposes per-component status + latency for: database, auth, email (Resend),
 * SMS (Twilio), payments (Stripe), AI (Anthropic). Aggregated overall_status:
 *   - 'operational'    — all green
 *   - 'partial_outage' — at least one degraded but none down
 *   - 'major_outage'   — at least one down
 *
 * Public, no auth. Rate-limited to 60 req/min per IP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ComponentStatus = 'operational' | 'degraded' | 'down';

interface ComponentResult {
  status: ComponentStatus;
  latency_ms?: number;
  error?: string;
}

interface SettlementOk { status: 'fulfilled'; value: ComponentResult }
interface SettlementErr { status: 'rejected'; reason: unknown }

const TIMEOUT_MS = 3000;

function getResult(s: SettlementOk | SettlementErr): ComponentResult {
  if (s.status === 'fulfilled') return s.value;
  return {
    status: 'down',
    error: s.reason instanceof Error ? s.reason.message : String(s.reason),
  };
}

async function timed<T extends ComponentResult>(fn: () => Promise<T>): Promise<T> {
  return fn();
}

async function checkDatabase(): Promise<ComponentResult> {
  const start = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('organizations').select('id').limit(1);
    const latency_ms = Date.now() - start;
    if (error) return { status: 'down', latency_ms, error: error.message };
    return { status: latency_ms > 1500 ? 'degraded' : 'operational', latency_ms };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkAuth(): Promise<ComponentResult> {
  // Supabase Auth health: hit the GoTrue health endpoint.
  const start = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { status: 'down', error: 'SUPABASE_URL not configured' };
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
    });
    const latency_ms = Date.now() - start;
    return {
      status: res.ok ? (latency_ms > 1500 ? 'degraded' : 'operational') : 'degraded',
      latency_ms,
    };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkResend(): Promise<ComponentResult> {
  const start = Date.now();
  try {
    // Resend doesn't publish an unauthenticated /health, but their root API responds 401/200.
    // We treat any HTTP response (including 401) as the API being reachable.
    const res = await fetch('https://api.resend.com/domains', {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: process.env.RESEND_API_KEY
        ? { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
        : {},
    });
    const latency_ms = Date.now() - start;
    if (res.status >= 500) return { status: 'down', latency_ms, error: `HTTP ${res.status}` };
    return { status: latency_ms > 1500 ? 'degraded' : 'operational', latency_ms };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkTwilio(): Promise<ComponentResult> {
  const start = Date.now();
  try {
    const res = await fetch('https://status.twilio.com/api/v2/status.json', {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - start;
    if (!res.ok) return { status: 'degraded', latency_ms, error: `HTTP ${res.status}` };
    const body = (await res.json()) as { status?: { indicator?: string } };
    const indicator = body.status?.indicator ?? 'none';
    const status: ComponentStatus =
      indicator === 'none' ? 'operational' : indicator === 'critical' ? 'down' : 'degraded';
    return { status, latency_ms };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkStripe(): Promise<ComponentResult> {
  const start = Date.now();
  try {
    const res = await fetch('https://status.stripe.com/api/v2/status.json', {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - start;
    if (!res.ok) return { status: 'degraded', latency_ms, error: `HTTP ${res.status}` };
    const body = (await res.json()) as { status?: { indicator?: string } };
    const indicator = body.status?.indicator ?? 'none';
    const status: ComponentStatus =
      indicator === 'none' ? 'operational' : indicator === 'critical' ? 'down' : 'degraded';
    return { status, latency_ms };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkAnthropic(): Promise<ComponentResult> {
  const start = Date.now();
  try {
    const res = await fetch('https://status.anthropic.com/api/v2/status.json', {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency_ms = Date.now() - start;
    if (!res.ok) return { status: 'degraded', latency_ms, error: `HTTP ${res.status}` };
    const body = (await res.json()) as { status?: { indicator?: string } };
    const indicator = body.status?.indicator ?? 'none';
    const status: ComponentStatus =
      indicator === 'none' ? 'operational' : indicator === 'critical' ? 'down' : 'degraded';
    return { status, latency_ms };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

export async function GET(req: NextRequest) {
  // Rate-limit: 60/min/IP
  const ip = getClientIp(req);
  const limit = checkRateLimit(`status-health:${ip}`, 60, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', resetAt: limit.resetAt },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const checks = await Promise.allSettled([
    timed(checkDatabase),
    timed(checkAuth),
    timed(checkResend),
    timed(checkTwilio),
    timed(checkStripe),
    timed(checkAnthropic),
  ]);

  const components = {
    database: getResult(checks[0] as SettlementOk | SettlementErr),
    auth: getResult(checks[1] as SettlementOk | SettlementErr),
    email: getResult(checks[2] as SettlementOk | SettlementErr),
    sms: getResult(checks[3] as SettlementOk | SettlementErr),
    payments: getResult(checks[4] as SettlementOk | SettlementErr),
    ai: getResult(checks[5] as SettlementOk | SettlementErr),
  };

  const values = Object.values(components);
  const overall_status: 'operational' | 'partial_outage' | 'major_outage' = values.every(
    (r) => r.status === 'operational',
  )
    ? 'operational'
    : values.some((r) => r.status === 'down')
      ? 'major_outage'
      : 'partial_outage';

  return NextResponse.json(
    {
      overall_status,
      components,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10',
        'X-RateLimit-Remaining': String(limit.remaining),
      },
    },
  );
}
