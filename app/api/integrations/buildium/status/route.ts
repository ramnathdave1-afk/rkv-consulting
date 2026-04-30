import { NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/buildium/status
 * Returns connection status, last sync, and recent sync log entries.
 */
export async function GET() {
  const { user, orgId } = await getUserOrg();
  if (!user || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: cfg } = await admin
    .from('integration_configs')
    .select('enabled, last_sync_at, last_sync_status, last_sync_summary, updated_at')
    .eq('org_id', orgId)
    .eq('provider', 'buildium')
    .maybeSingle();

  const { data: logs } = await admin
    .from('integration_sync_logs')
    .select('id, entity_type, status, imported, updated, skipped, errors, triggered_by, created_at')
    .eq('org_id', orgId)
    .eq('provider', 'buildium')
    .order('created_at', { ascending: false })
    .limit(25);

  return NextResponse.json({
    connected: Boolean(cfg?.enabled),
    last_sync_at: cfg?.last_sync_at ?? null,
    last_sync_status: cfg?.last_sync_status ?? null,
    last_sync_summary: cfg?.last_sync_summary ?? null,
    updated_at: cfg?.updated_at ?? null,
    logs: logs ?? [],
  });
}
