import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scheduleRentReminderCalls, scheduleMaintenanceUpdateCalls } from '@/lib/automations/voice-campaigns';
import { verifyCronAuth } from '@/lib/auth/cron';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const unauthorized = verifyCronAuth(request);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  captureMessage('cron:voice-campaigns:start', 'info');

  try {
    const results: Array<Record<string, unknown>> = [];

    // Get all orgs
    const { data: orgs } = await supabase.from('organizations').select('id, name');

    for (const org of orgs || []) {
      try {
        const rentCalls = await scheduleRentReminderCalls(org.id);
        const maintenanceCalls = await scheduleMaintenanceUpdateCalls(org.id);
        results.push({
          org: org.name,
          rentCalls: rentCalls.length,
          maintenanceCalls: maintenanceCalls.length,
        });
      } catch (err) {
        captureException(err, { cron: 'voice-campaigns', org_id: org.id, org_name: org.name });
        results.push({ org: org.name, error: String(err) });
      }
      // 500ms delay between orgs to avoid overwhelming services
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    captureMessage('cron:voice-campaigns:end', 'info', {
      duration_ms: Date.now() - startedAt,
      orgs_processed: (orgs || []).length,
    });

    return NextResponse.json({ success: true, results });
  } catch (err) {
    captureException(err, { cron: 'voice-campaigns' });
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
