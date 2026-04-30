import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/integrations/credentials';
import {
  ALL_ENTITIES,
  runSync,
  type BuildiumCredentials,
  type BuildiumEntity,
} from '@/lib/integrations/buildium';
import { captureException } from '@/lib/monitoring/sentry';
import { requireFeature } from '@/lib/billing/gate';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/buildium/sync
 * Body: { entities?: BuildiumEntity[] }
 *
 * Pulls fresh data from Buildium and upserts into the org's tables.
 * Writes a row to integration_sync_logs per entity and updates
 * integration_configs.last_sync_*.
 *
 * NOTE: maxDuration = 60 means very large portfolios may need to be split
 * into multiple per-entity calls. The roadmap is a queued worker.
 */
export async function POST(req: NextRequest) {
  const { user, orgId, role } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role && !['admin', 'owner'].includes(role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const gate = await requireFeature(orgId, 'pm_integrations');
  if (!gate.allowed) return gate.response;

  let body: { entities?: BuildiumEntity[] } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — sync everything
  }

  const requested = body.entities && body.entities.length > 0 ? body.entities : ALL_ENTITIES;
  const entities = requested.filter((e): e is BuildiumEntity =>
    (ALL_ENTITIES as string[]).includes(e),
  );

  const admin = createAdminClient();

  // Load + decrypt creds
  const { data: cfg, error: cfgErr } = await admin
    .from('integration_configs')
    .select('config, enabled')
    .eq('org_id', orgId)
    .eq('provider', 'buildium')
    .maybeSingle();
  if (cfgErr) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  }
  if (!cfg || !cfg.enabled) {
    return NextResponse.json({ error: 'Buildium is not connected.' }, { status: 400 });
  }
  const encrypted = (cfg.config as { credentials?: { iv: string; encrypted: string } })?.credentials;
  if (!encrypted?.iv || !encrypted?.encrypted) {
    return NextResponse.json({ error: 'No stored Buildium credentials.' }, { status: 400 });
  }

  let credentials: BuildiumCredentials;
  try {
    const decrypted = decryptCredentials(encrypted);
    credentials = {
      client_id: decrypted.client_id,
      client_secret: decrypted.client_secret,
    };
  } catch (err) {
    captureException(err, { context: 'buildium_sync_decrypt' });
    return NextResponse.json({ error: 'Could not decrypt credentials.' }, { status: 500 });
  }

  const startedAt = new Date();
  let results;
  try {
    results = await runSync(orgId, credentials, admin, entities);
  } catch (err) {
    captureException(err, { context: 'buildium_sync_run', orgId });
    await admin
      .from('integration_configs')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'failed',
        last_sync_summary: { error: err instanceof Error ? err.message : 'unknown' },
      })
      .eq('org_id', orgId)
      .eq('provider', 'buildium');
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    );
  }

  // Write per-entity sync log rows
  const logRows: {
    org_id: string;
    provider: 'buildium';
    entity_type: string;
    status: 'success' | 'partial' | 'failed';
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
    triggered_by: string;
  }[] = [];
  for (const entity of entities) {
    const r = results[entity];
    if (!r) continue;
    const status: 'success' | 'partial' | 'failed' =
      r.errors.length === 0 ? 'success' : r.imported + r.updated > 0 ? 'partial' : 'failed';
    logRows.push({
      org_id: orgId,
      provider: 'buildium',
      entity_type: entity,
      status,
      imported: r.imported,
      updated: r.updated,
      skipped: r.skipped,
      errors: r.errors.slice(0, 25), // cap stored error volume
      triggered_by: 'manual',
    });
  }
  if (logRows.length > 0) {
    const { error: logErr } = await admin.from('integration_sync_logs').insert(logRows);
    if (logErr) captureException(new Error(logErr.message), { context: 'buildium_sync_log_insert' });
  }

  const totalErrors = logRows.reduce((acc, r) => acc + r.errors.length, 0);
  const totalImported = logRows.reduce((acc, r) => acc + r.imported, 0);
  const overallStatus: 'success' | 'partial' | 'failed' =
    totalErrors === 0 ? 'success' : totalImported > 0 ? 'partial' : 'failed';

  await admin
    .from('integration_configs')
    .update({
      last_sync_at: startedAt.toISOString(),
      last_sync_status: overallStatus,
      last_sync_summary: { entities, results },
    })
    .eq('org_id', orgId)
    .eq('provider', 'buildium');

  return NextResponse.json({
    ok: overallStatus !== 'failed',
    status: overallStatus,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    results,
  });
}
