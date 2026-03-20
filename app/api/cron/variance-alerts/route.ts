import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkVarianceAlerts } from '@/lib/analytics/variance-alerts';
import { upsertDeferredMaintenance } from '@/lib/maintenance/deferred-tracker';

// Runs daily to check all orgs for variance alerts and deferred maintenance
export async function GET() {
  const authHeader = process.env.CRON_SECRET;
  // In production, validate the cron secret

  const supabase = createAdminClient();
  const { data: orgs } = await supabase.from('organizations').select('id');

  let totalAlerts = 0;
  let totalDeferred = 0;

  for (const org of (orgs || [])) {
    try {
      const alerts = await checkVarianceAlerts(org.id);
      const deferred = await upsertDeferredMaintenance(org.id);
      totalAlerts += alerts;
      totalDeferred += deferred;
    } catch (err) {
      console.error(`Variance alert check failed for org ${org.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    total_alerts_created: totalAlerts,
    total_deferred_updated: totalDeferred,
    checked_orgs: (orgs || []).length,
  });
}
