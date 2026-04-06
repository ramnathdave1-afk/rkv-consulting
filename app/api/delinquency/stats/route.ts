import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createAdminClient();

  // All rent payments for this org in the current period
  const { data: allPayments, error: allErr } = await supabase
    .from('rent_payments')
    .select('id, amount_due, amount_paid, status, days_late')
    .eq('org_id', ORG_ID);

  if (allErr) {
    return NextResponse.json({ error: allErr.message }, { status: 500 });
  }

  const payments = allPayments || [];

  // Delinquent = status in late/delinquent/partial
  const delinquent = payments.filter((p) =>
    ['late', 'delinquent', 'partial'].includes(p.status)
  );

  const totalOutstanding = delinquent.reduce(
    (sum, p) => sum + ((p.amount_due || 0) - (p.amount_paid || 0)),
    0
  );

  const delinquentCount = delinquent.length;

  const avgDaysLate =
    delinquentCount > 0
      ? Math.round(
          delinquent.reduce((sum, p) => sum + (p.days_late || 0), 0) / delinquentCount
        )
      : 0;

  // Collection rate = total collected / total due across ALL payments
  const totalDue = payments.reduce((sum, p) => sum + (p.amount_due || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 10000) / 100 : 100;

  return NextResponse.json({
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    delinquentCount,
    avgDaysLate,
    collectionRate,
  });
}
