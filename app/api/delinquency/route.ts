import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createAdminClient();

  // Fetch delinquent rent payments with tenant/property/unit joins
  const { data: payments, error } = await supabase
    .from('rent_payments')
    .select(`
      id, amount_due, amount_paid, due_date, status, days_late, late_fee, paid_date,
      lease_id,
      leases!inner(
        id, tenant_id,
        tenants!inner(id, name, phone, email),
        units!inner(id, unit_number, property_id,
          properties!inner(id, name)
        )
      )
    `)
    .eq('org_id', ORG_ID)
    .in('status', ['late', 'delinquent', 'partial'])
    .order('days_late', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get last delinquency action per payment
  const paymentIds = (payments || []).map((p: any) => p.id);
  let actionsMap: Record<string, string> = {};

  if (paymentIds.length > 0) {
    const { data: actions } = await supabase
      .from('delinquency_actions')
      .select('rent_payment_id, created_at')
      .in('rent_payment_id', paymentIds)
      .order('created_at', { ascending: false });

    if (actions) {
      for (const a of actions) {
        if (!actionsMap[a.rent_payment_id]) {
          actionsMap[a.rent_payment_id] = a.created_at;
        }
      }
    }
  }

  // Flatten the joined data
  const rows = (payments || []).map((p: any) => {
    const lease = p.leases;
    const tenant = lease.tenants;
    const unit = lease.units;
    const property = unit.properties;
    const balance = (p.amount_due || 0) - (p.amount_paid || 0);

    return {
      id: p.id,
      tenant_name: tenant.name,
      tenant_id: tenant.id,
      tenant_phone: tenant.phone,
      property_name: property.name,
      property_id: property.id,
      unit_number: unit.unit_number,
      amount_due: p.amount_due,
      amount_paid: p.amount_paid || 0,
      balance,
      days_late: p.days_late || 0,
      late_fee: p.late_fee || 0,
      status: p.status,
      due_date: p.due_date,
      last_action_date: actionsMap[p.id] || null,
    };
  });

  // Aging bucket aggregation
  const buckets = { '0-30': 0, '30-60': 0, '60-90': 0, '90+': 0 };
  for (const row of rows) {
    const bal = row.balance;
    if (row.days_late <= 30) buckets['0-30'] += bal;
    else if (row.days_late <= 60) buckets['30-60'] += bal;
    else if (row.days_late <= 90) buckets['60-90'] += bal;
    else buckets['90+'] += bal;
  }

  return NextResponse.json({
    rows,
    agingBuckets: [
      { name: '0-30 days', amount: Math.round(buckets['0-30'] * 100) / 100 },
      { name: '30-60 days', amount: Math.round(buckets['30-60'] * 100) / 100 },
      { name: '60-90 days', amount: Math.round(buckets['60-90'] * 100) / 100 },
      { name: '90+ days', amount: Math.round(buckets['90+'] * 100) / 100 },
    ],
  });
}
