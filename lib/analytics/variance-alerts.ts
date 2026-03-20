/**
 * Variance Alerts Engine
 * Monitors occupancy drops >5%, expense spikes >10%, rent collection <95%.
 * Generates alerts when thresholds are breached.
 */

import { createAdminClient } from '@/lib/supabase/admin';

interface AlertConfig {
  type: 'occupancy_drop' | 'expense_spike' | 'collection_low' | 'maintenance_budget';
  threshold: number;
}

const DEFAULT_THRESHOLDS: AlertConfig[] = [
  { type: 'occupancy_drop', threshold: 5 },
  { type: 'expense_spike', threshold: 10 },
  { type: 'collection_low', threshold: 95 },
  { type: 'maintenance_budget', threshold: 10 },
];

export async function checkVarianceAlerts(orgId: string, propertyId?: string): Promise<number> {
  const supabase = createAdminClient();
  let alertsCreated = 0;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // 1. Occupancy Check
  let unitQuery = supabase.from('units').select('id, status, property_id').eq('org_id', orgId);
  if (propertyId) unitQuery = unitQuery.eq('property_id', propertyId);
  const { data: units } = await unitQuery;

  if (units && units.length > 0) {
    // Group by property
    const byProperty: Record<string, { total: number; occupied: number }> = {};
    for (const u of units) {
      if (!byProperty[u.property_id]) byProperty[u.property_id] = { total: 0, occupied: 0 };
      byProperty[u.property_id].total++;
      if (u.status === 'occupied') byProperty[u.property_id].occupied++;
    }

    for (const [propId, counts] of Object.entries(byProperty)) {
      const rate = (counts.occupied / counts.total) * 100;
      if (rate < (100 - DEFAULT_THRESHOLDS[0].threshold)) {
        await supabase.from('variance_alerts').insert({
          org_id: orgId,
          property_id: propId,
          alert_type: 'occupancy_drop',
          severity: rate < 85 ? 'critical' : 'warning',
          metric_name: 'occupancy_rate',
          threshold_value: 95,
          actual_value: rate,
          variance_pct: 100 - rate,
          message: `Occupancy dropped to ${rate.toFixed(1)}% (${counts.occupied}/${counts.total} units occupied)`,
        });
        alertsCreated++;
      }
    }
  }

  // 2. Expense Spike Check (current vs previous month)
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const prevMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

  const [{ data: currentExpenses }, { data: prevExpenses }] = await Promise.all([
    supabase.from('financial_transactions')
      .select('amount, property_id')
      .eq('org_id', orgId).eq('type', 'expense')
      .eq('period_month', currentMonth).eq('period_year', currentYear),
    supabase.from('financial_transactions')
      .select('amount, property_id')
      .eq('org_id', orgId).eq('type', 'expense')
      .eq('period_month', prevMonth).eq('period_year', prevYear),
  ]);

  const currTotal = (currentExpenses || []).reduce((s, t) => s + Number(t.amount), 0);
  const prevTotal = (prevExpenses || []).reduce((s, t) => s + Number(t.amount), 0);

  if (prevTotal > 0) {
    const spikePct = ((currTotal - prevTotal) / prevTotal) * 100;
    if (spikePct > DEFAULT_THRESHOLDS[1].threshold) {
      await supabase.from('variance_alerts').insert({
        org_id: orgId,
        property_id: propertyId || null,
        alert_type: 'expense_spike',
        severity: spikePct > 25 ? 'critical' : 'warning',
        metric_name: 'monthly_expenses',
        threshold_value: prevTotal * 1.1,
        actual_value: currTotal,
        variance_pct: spikePct,
        message: `Expenses up ${spikePct.toFixed(1)}% vs last month ($${currTotal.toLocaleString()} vs $${prevTotal.toLocaleString()})`,
      });
      alertsCreated++;
    }
  }

  // 3. Rent Collection Check
  const { data: payments } = await supabase
    .from('rent_payments')
    .select('amount_due, amount_paid, status')
    .eq('org_id', orgId)
    .gte('due_date', monthStart);

  if (payments && payments.length > 0) {
    const totalDue = payments.reduce((s, p) => s + Number(p.amount_due), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount_paid), 0);
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 100;

    if (collectionRate < DEFAULT_THRESHOLDS[2].threshold) {
      await supabase.from('variance_alerts').insert({
        org_id: orgId,
        property_id: propertyId || null,
        alert_type: 'collection_low',
        severity: collectionRate < 90 ? 'critical' : 'warning',
        metric_name: 'rent_collection_rate',
        threshold_value: 95,
        actual_value: collectionRate,
        variance_pct: 95 - collectionRate,
        message: `Rent collection at ${collectionRate.toFixed(1)}% ($${totalPaid.toLocaleString()} of $${totalDue.toLocaleString()} collected)`,
      });
      alertsCreated++;
    }
  }

  return alertsCreated;
}
