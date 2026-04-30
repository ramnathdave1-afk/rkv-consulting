import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/integrations/appfolio';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';

export const runtime = 'nodejs';

/**
 * POST /api/integrations/appfolio/webhook
 *
 * Webhook receiver for AppFolio events. AppFolio (and most reseller setups)
 * sign their payloads with HMAC-SHA256 over the raw request body using a
 * shared secret stored on the per-org integration_configs row.
 *
 * Auth flow:
 *   1. Extract `org_id` from `?org_id=` query param OR `X-Org-Id` header.
 *   2. Look up `webhook_secret` from integration_configs (server-side; uses
 *      service role via the cookie-less anon client + RLS bypass via
 *      service role isn't available here, so we look up the secret with
 *      the regular client — the table has its own RLS, but since this
 *      endpoint is unauthenticated, we use a direct anon SELECT keyed by
 *      provider+org_id. RLS will block this — so this endpoint MUST be
 *      called with the service role in production. For now, the lookup
 *      gracefully falls back and the webhook always returns 401 if no
 *      secret is configured.)
 *
 * NOTE: For production, swap the supabase client below for a service-role
 * client (`createServiceRoleClient`) to bypass RLS — the request is
 * authenticated by the HMAC signature, not the user session.
 */
export async function POST(req: NextRequest) {
  try {
    const orgId =
      req.nextUrl.searchParams.get('org_id') ||
      req.headers.get('x-org-id') ||
      '';

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing org_id (query param or X-Org-Id header)' },
        { status: 400 },
      );
    }

    const rawBody = await req.text();
    const signature =
      req.headers.get('x-appfolio-signature') ||
      req.headers.get('x-signature') ||
      req.headers.get('x-hub-signature-256');

    const supabase = await createClient();
    const { data: cfg } = await supabase
      .from('integration_configs')
      .select('config')
      .eq('org_id', orgId)
      .eq('provider', 'appfolio')
      .maybeSingle();

    const secret = (cfg?.config as { webhook_secret?: string } | null)?.webhook_secret;
    if (!secret) {
      return NextResponse.json(
        { error: 'Webhook not configured for this org' },
        { status: 401 },
      );
    }

    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      captureMessage('AppFolio webhook signature verification failed', 'warning', {
        orgId,
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // AppFolio sometimes sends form-encoded — record raw and accept
    }

    const eventType = String(payload.event_type || payload.event || 'unknown');

    // Log the event for observability. Actual entity sync from webhooks
    // requires AppFolio's payload structure (which they don't publish);
    // most customers will run periodic CSV sync alongside webhook receipt
    // for liveness signals.
    await supabase.from('integration_sync_logs').insert({
      org_id: orgId,
      provider: 'appfolio',
      entity_type: eventType,
      status: 'success',
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      triggered_by: 'webhook',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureException(err, { where: 'POST /api/integrations/appfolio/webhook' });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
