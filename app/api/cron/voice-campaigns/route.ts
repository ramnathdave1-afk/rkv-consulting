import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scheduleRentReminderCalls, scheduleMaintenanceUpdateCalls } from '@/lib/automations/voice-campaigns';
import { verifyCronAuth } from '@/lib/auth/cron';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const unauthorized = verifyCronAuth(request);
  if (unauthorized) return unauthorized;

  const results: any[] = [];

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
      console.error(`Voice campaign failed for ${org.name}:`, err);
      results.push({ org: org.name, error: String(err) });
    }
  }

  return NextResponse.json({ success: true, results });
}
