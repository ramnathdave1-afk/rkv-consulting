import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { initRenewalSequence, processRenewalStep } from '@/lib/renewals/sequences';
import { verifyCronAuth } from '@/lib/auth/cron';
import { captureException, captureMessage } from '@/lib/monitoring/sentry';

export async function GET(request: NextRequest) {
  const unauthorized = verifyCronAuth(request);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  captureMessage('cron:lease-renewals:start', 'info');

  try {
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

    // Chunk by org
    const byOrg = new Map<string, typeof expiringLeases>();
    for (const l of expiringLeases || []) {
      const list = byOrg.get(l.org_id) || [];
      list.push(l);
      byOrg.set(l.org_id, list);
    }

    for (const [orgId, leases] of byOrg.entries()) {
      for (const lease of leases || []) {
        try {
          // Idempotency: only create if no active/paused/completed sequence exists
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
        } catch (err) {
          captureException(err, { cron: 'lease-renewals', stage: 'init', lease_id: lease.id, org_id: orgId });
          results.errors++;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 2. Send 60-day notices
    const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: need60 } = await supabase
      .from('lease_renewal_sequences')
      .select('id, leases(lease_end)')
      .eq('status', 'active')
      .not('step_90_sent_at', 'is', null)
      .is('step_60_sent_at', null);

    for (const seq of need60 || []) {
      try {
        const leaseEnd = (seq.leases as unknown as { lease_end: string })?.lease_end;
        if (leaseEnd && leaseEnd <= day60) {
          await processRenewalStep(seq.id, '60');
          results.step_60_sent++;
        }
      } catch (err) {
        captureException(err, { cron: 'lease-renewals', stage: 'step_60', sequence_id: seq.id });
        results.errors++;
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

    for (const seq of need30 || []) {
      try {
        const leaseEnd = (seq.leases as unknown as { lease_end: string })?.lease_end;
        if (leaseEnd && leaseEnd <= day30) {
          await processRenewalStep(seq.id, '30');
          results.step_30_sent++;
        }
      } catch (err) {
        captureException(err, { cron: 'lease-renewals', stage: 'step_30', sequence_id: seq.id });
        results.errors++;
      }
    }

    captureMessage('cron:lease-renewals:end', 'info', {
      duration_ms: Date.now() - startedAt,
      ...results,
    });

    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    captureException(err, { cron: 'lease-renewals' });
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
