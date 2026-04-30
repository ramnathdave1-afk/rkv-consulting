import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkVarianceAlerts } from '@/lib/analytics/variance-alerts';
import { upsertDeferredMaintenance } from '@/lib/maintenance/deferred-tracker';
import { verifyCronAuth } from '@/lib/auth/cron';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';

// Runs daily to check all orgs for variance alerts and deferred maintenance
export async function GET(request: NextRequest) {
  const unauthorized = verifyCronAuth(request);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  captureMessage('cron:variance-alerts:start', 'info');

  try {
    const supabase = createAdminClient();
    const { data: orgs } = await supabase.from('organizations').select('id');

    let totalAlerts = 0;
    let totalDeferred = 0;

    for (const org of orgs || []) {
      try {
        const alerts = await checkVarianceAlerts(org.id);
        const deferred = await upsertDeferredMaintenance(org.id);
        totalAlerts += alerts;
        totalDeferred += deferred;
      } catch (err) {
        captureException(err, { cron: 'variance-alerts', org_id: org.id });
      }
      // 500ms delay between orgs to avoid overwhelming services
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    captureMessage('cron:variance-alerts:end', 'info', {
      duration_ms: Date.now() - startedAt,
      total_alerts_created: totalAlerts,
      total_deferred_updated: totalDeferred,
      checked_orgs: (orgs || []).length,
    });

    return NextResponse.json({
      success: true,
      total_alerts_created: totalAlerts,
      total_deferred_updated: totalDeferred,
      checked_orgs: (orgs || []).length,
    });
  } catch (err) {
    captureException(err, { cron: 'variance-alerts' });
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
