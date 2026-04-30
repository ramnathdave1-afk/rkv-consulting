import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import { captureException } from '@/lib/monitoring/sentry';

export const runtime = 'nodejs';

/** GET /api/integrations/appfolio/logs?limit=50 */
export async function GET(req: NextRequest) {
  try {
    const { user, orgId, supabase } = await getUserOrg();
    if (!user || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitRaw = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 200);

    const { data, error } = await supabase
      .from('integration_sync_logs')
      .select('id, entity_type, status, imported, updated, skipped, errors, triggered_by, created_at')
      .eq('org_id', orgId)
      .eq('provider', 'appfolio')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    captureException(err, { where: 'GET /api/integrations/appfolio/logs' });
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
