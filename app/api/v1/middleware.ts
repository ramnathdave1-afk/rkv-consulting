/**
 * API v1 Middleware — Key validation, rate limiting, usage logging.
 *
 * Usage in route handlers:
 *   const auth = await validateApiKey(request);
 *   if (auth.error) return auth.error;
 *   // auth.orgId and auth.keyId are available
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export interface ApiAuth {
  orgId: string;
  keyId: string;
  scopes: string[];
  error?: never;
}

export interface ApiAuthError {
  error: NextResponse;
  orgId?: never;
  keyId?: never;
  scopes?: never;
}

export async function validateApiKey(request: NextRequest): Promise<ApiAuth | ApiAuthError> {
  const startTime = Date.now();
  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.nextUrl.searchParams.get('api_key');

  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: 'Missing API key. Provide via Authorization: Bearer <key> header or api_key query parameter.' },
        { status: 401 },
      ),
    };
  }

  // Hash the key for lookup
  const keyHash = await hashKey(apiKey);

  // Look up key
  const { data: key, error } = await supabase
    .from('api_keys')
    .select('id, org_id, scopes, rate_limit_rpm, is_active, expires_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !key) {
    return {
      error: NextResponse.json({ error: 'Invalid API key.' }, { status: 401 }),
    };
  }

  if (!key.is_active) {
    return {
      error: NextResponse.json({ error: 'API key has been revoked.' }, { status: 403 }),
    };
  }

  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return {
      error: NextResponse.json({ error: 'API key has expired.' }, { status: 403 }),
    };
  }

  // Rate limiting
  const { data: rateCheck } = await supabase.rpc('check_rate_limit', { p_key_hash: keyHash });
  const rateResult = rateCheck?.[0];

  if (rateResult && !rateResult.allowed) {
    return {
      error: NextResponse.json(
        { error: 'Rate limit exceeded.', limit: rateResult.limit_rpm, current: rateResult.current_count },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(rateResult.limit_rpm),
            'X-RateLimit-Remaining': '0',
          },
        },
      ),
    };
  }

  // Log usage (fire and forget)
  const endpoint = request.nextUrl.pathname;
  const method = request.method;

  supabase.from('api_usage').insert({
    api_key_id: key.id,
    endpoint,
    method,
    status_code: 200, // Will be updated if needed
    response_time_ms: Date.now() - startTime,
    ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
    user_agent: request.headers.get('user-agent') || null,
  }).then(() => {});

  return {
    orgId: key.org_id,
    keyId: key.id,
    scopes: key.scopes || ['read'],
  };
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new API key. Returns the raw key (only shown once) and its hash.
 */
export async function generateApiKey(): Promise<{ rawKey: string; keyHash: string; keyPrefix: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const rawKey = 'mn_live_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 16);

  return { rawKey, keyHash, keyPrefix };
}

/**
 * Standard API error response format.
 */
export function apiError(message: string, status: number, details?: Record<string, unknown>): NextResponse {
  return NextResponse.json({
    error: message,
    status,
    ...details,
  }, { status });
}

/**
 * Standard API success response with pagination.
 */
export function apiSuccess<T>(data: T, meta?: { total?: number; offset?: number; limit?: number }): NextResponse {
  return NextResponse.json({
    data,
    meta: meta || {},
    timestamp: new Date().toISOString(),
  });
}
