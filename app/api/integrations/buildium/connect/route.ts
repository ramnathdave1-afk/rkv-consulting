import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptCredentials } from '@/lib/integrations/credentials';
import { testConnection, type BuildiumCredentials } from '@/lib/integrations/buildium';
import { captureException } from '@/lib/monitoring/sentry';
import { requireFeature, requireIntegrationLimit } from '@/lib/billing/gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/buildium/connect
 * Body: { client_id, client_secret }
 *
 * Tests the Buildium credentials, then encrypts and stores them in
 * integration_configs (provider='buildium').
 */
export async function POST(req: NextRequest) {
  const { user, orgId, role } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role && !['admin', 'owner'].includes(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const featureGate = await requireFeature(orgId, 'pm_integrations');
  if (!featureGate.allowed) return featureGate.response;

  const limitGate = await requireIntegrationLimit(orgId);
  if (!limitGate.allowed) return limitGate.response;

  let body: Partial<BuildiumCredentials>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const client_id = body.client_id?.trim();
  const client_secret = body.client_secret?.trim();
  if (!client_id || !client_secret) {
    return NextResponse.json(
      { error: 'client_id and client_secret are required' },
      { status: 400 },
    );
  }

  // Test connection FIRST — never store bad creds.
  const ok = await testConnection({ client_id, client_secret });
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: 'Buildium rejected those credentials.' },
      { status: 400 },
    );
  }

  const encrypted = encryptCredentials({ client_id, client_secret });

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('integration_configs')
      .upsert(
        {
          org_id: orgId,
          provider: 'buildium',
          enabled: true,
          config: { credentials: encrypted },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,provider' },
      );
    if (error) throw new Error(error.message);
  } catch (err) {
    captureException(err, { context: 'buildium_connect_store' });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to store credentials' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/integrations/buildium/connect
 * Disconnect — disables the integration and removes stored credentials.
 */
export async function DELETE() {
  const { user, orgId, role } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role && !['admin', 'owner'].includes(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('integration_configs')
    .update({ enabled: false, config: {} })
    .eq('org_id', orgId)
    .eq('provider', 'buildium');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
