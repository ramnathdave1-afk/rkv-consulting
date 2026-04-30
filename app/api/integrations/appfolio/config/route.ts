import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import {
  encodeSecret,
  generateWebhookSecret,
} from '@/lib/integrations/appfolio';
import { captureException } from '@/lib/monitoring/sentry';
import { requireFeature } from '@/lib/billing/gate';

export const runtime = 'nodejs';

interface ConfigBody {
  enabled?: boolean;
  sftp_host?: string;
  sftp_user?: string;
  sftp_password?: string; // plaintext on input; we encode before persisting
  rotate_webhook_secret?: boolean;
}

/** GET — returns the current config (redacts the SFTP password and webhook secret). */
export async function GET() {
  try {
    const { user, orgId, supabase } = await getUserOrg();
    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('integration_configs')
      .select('id, org_id, provider, config, enabled, last_sync_at, last_sync_status, last_sync_summary, created_at, updated_at')
      .eq('org_id', orgId)
      .eq('provider', 'appfolio')
      .maybeSingle();

    if (error) throw error;

    const config = (data?.config ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      config: {
        enabled: data?.enabled ?? false,
        sftp_host: config.sftp_host ?? null,
        sftp_user: config.sftp_user ?? null,
        sftp_password_set: Boolean(config.sftp_password_encrypted),
        webhook_secret_set: Boolean(config.webhook_secret),
        last_sync_at: data?.last_sync_at ?? null,
        last_sync_status: data?.last_sync_status ?? null,
        last_sync_summary: data?.last_sync_summary ?? null,
      },
    });
  } catch (err) {
    captureException(err, { where: 'GET /api/integrations/appfolio/config' });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT — upserts the config. If `rotate_webhook_secret` is true OR no secret
 * exists yet, generates a new one and returns it ONCE in the response.
 */
export async function PUT(req: NextRequest) {
  try {
    const { user, orgId, role, supabase } = await getUserOrg();
    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!role || !['admin', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const gate = await requireFeature(orgId, 'pm_integrations');
    if (!gate.allowed) return gate.response;

    const body: ConfigBody = await req.json();

    const { data: existing } = await supabase
      .from('integration_configs')
      .select('id, config')
      .eq('org_id', orgId)
      .eq('provider', 'appfolio')
      .maybeSingle();

    const currentConfig = (existing?.config ?? {}) as Record<string, unknown>;

    let newWebhookSecret: string | null = null;
    if (body.rotate_webhook_secret || !currentConfig.webhook_secret) {
      newWebhookSecret = generateWebhookSecret();
    }

    const merged: Record<string, unknown> = {
      ...currentConfig,
      ...(body.sftp_host !== undefined ? { sftp_host: body.sftp_host || null } : {}),
      ...(body.sftp_user !== undefined ? { sftp_user: body.sftp_user || null } : {}),
      ...(body.sftp_password
        ? { sftp_password_encrypted: encodeSecret(body.sftp_password) }
        : {}),
      ...(newWebhookSecret ? { webhook_secret: newWebhookSecret } : {}),
    };

    const payload = {
      org_id: orgId,
      provider: 'appfolio',
      config: merged,
      enabled: body.enabled ?? existing?.id !== undefined,
    };

    let saved;
    if (existing) {
      const { data, error } = await supabase
        .from('integration_configs')
        .update(payload)
        .eq('id', existing.id)
        .select('id, enabled')
        .single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase
        .from('integration_configs')
        .insert(payload)
        .select('id, enabled')
        .single();
      if (error) throw error;
      saved = data;
    }

    return NextResponse.json({
      ok: true,
      id: saved.id,
      enabled: saved.enabled,
      // Only returned the one time it was generated/rotated
      webhook_secret: newWebhookSecret,
    });
  } catch (err) {
    captureException(err, { where: 'PUT /api/integrations/appfolio/config' });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
