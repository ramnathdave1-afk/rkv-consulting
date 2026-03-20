import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { initRenewalSequence, processRenewalStep } from '@/lib/renewals/sequences';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = { sequences_created: 0, step_60_sent: 0, step_30_sent: 0, errors: 0 };

  // 1. Create sequences for leases expiring in 85-95 days (no existing sequence)
  const day85 = new Date(now.getTime() + 85 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const day95 = new Date(now.getTime() + 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: expiringLeases } = await supabase
    .from('leases')
    .select('id, org_id, tenant_id, unit_id, lease_end, monthly_rent, tenants(first_name, last_name, phone), units(unit_number, properties(name))')
    .eq('status', 'active')
    .gte('lease_end', day85)
    .lte('lease_end', day95);

  for (const lease of (expiringLeases || [])) {
    // Check if sequence already exists
    const { data: existing } = await supabase
      .from('lease_renewal_sequences')
      .select('id')
      .eq('lease_id', lease.id)
      .in('status', ['active', 'paused', 'completed'])
      .limit(1)
      .single();

    if (!existing) {
      const seqId = await initRenewalSequence(lease as unknown as Parameters<typeof initRenewalSequence>[0]);
      if (seqId) results.sequences_created++;
      else results.errors++;
    }
  }

  // 2. Send 60-day notices
  const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: need60 } = await supabase
    .from('lease_renewal_sequences')
    .select('id, leases(lease_end)')
    .eq('status', 'active')
    .not('step_90_sent_at', 'is', null)
    .is('step_60_sent_at', null);

  for (const seq of (need60 || [])) {
    const leaseEnd = (seq.leases as unknown as { lease_end: string })?.lease_end;
    if (leaseEnd && leaseEnd <= day60) {
      await processRenewalStep(seq.id, '60');
      results.step_60_sent++;
    }
  }

  // 3. Send 30-day notices
  const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: need30 } = await supabase
    .from('lease_renewal_sequences')
    .select('id, leases(lease_end)')
    .eq('status', 'active')
    .not('step_60_sent_at', 'is', null)
    .is('step_30_sent_at', null);

  for (const seq of (need30 || [])) {
    const leaseEnd = (seq.leases as unknown as { lease_end: string })?.lease_end;
    if (leaseEnd && leaseEnd <= day30) {
      await processRenewalStep(seq.id, '30');
      results.step_30_sent++;
    }
  }

  return NextResponse.json({ success: true, ...results });
}
