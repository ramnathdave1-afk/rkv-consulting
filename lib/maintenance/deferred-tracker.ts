/**
 * Deferred Maintenance Tracker
 * Flags recurring issues, tracks cost trends, and generates capital reserve alerts.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface RecurringIssue {
  category: string;
  property_id: string;
  unit_id: string | null;
  occurrence_count: number;
  total_cost: number;
  first_reported: string;
  last_reported: string;
}

export async function detectRecurringIssues(orgId: string): Promise<RecurringIssue[]> {
  const supabase = createAdminClient();

  // Find work orders with similar categories in the same unit/property (3+ in 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('id, property_id, unit_id, category, cost, created_at')
    .eq('org_id', orgId)
    .gte('created_at', twelveMonthsAgo.toISOString())
    .in('status', ['completed', 'closed'])
    .order('created_at', { ascending: true });

  if (!workOrders || workOrders.length === 0) return [];

  // Group by property + unit + category
  const groups: Record<string, { ids: string[]; costs: number[]; dates: string[]; property_id: string; unit_id: string | null; category: string }> = {};

  for (const wo of workOrders) {
    const key = `${wo.property_id}|${wo.unit_id || 'property'}|${wo.category}`;
    if (!groups[key]) {
      groups[key] = { ids: [], costs: [], dates: [], property_id: wo.property_id, unit_id: wo.unit_id, category: wo.category };
    }
    groups[key].ids.push(wo.id);
    groups[key].costs.push(Number(wo.cost) || 0);
    groups[key].dates.push(wo.created_at);
  }

  // Flag groups with 3+ occurrences as recurring
  return Object.values(groups)
    .filter((g) => g.ids.length >= 3)
    .map((g) => ({
      category: g.category,
      property_id: g.property_id,
      unit_id: g.unit_id,
      occurrence_count: g.ids.length,
      total_cost: g.costs.reduce((s, c) => s + c, 0),
      first_reported: g.dates[0],
      last_reported: g.dates[g.dates.length - 1],
    }));
}

export async function upsertDeferredMaintenance(orgId: string): Promise<number> {
  const supabase = createAdminClient();
  const issues = await detectRecurringIssues(orgId);
  let upserted = 0;

  for (const issue of issues) {
    const avgCost = issue.total_cost / issue.occurrence_count;
    const priority = issue.occurrence_count >= 6 ? 'critical' : issue.occurrence_count >= 4 ? 'high' : 'medium';

    const { error } = await supabase
      .from('deferred_maintenance')
      .upsert({
        org_id: orgId,
        property_id: issue.property_id,
        unit_id: issue.unit_id,
        category: issue.category,
        description: `Recurring ${issue.category} issue — ${issue.occurrence_count} occurrences in 12 months`,
        occurrence_count: issue.occurrence_count,
        first_reported_at: issue.first_reported,
        last_reported_at: issue.last_reported,
        total_cost: issue.total_cost,
        avg_cost_per_occurrence: avgCost,
        priority,
        estimated_replacement_cost: avgCost * 10,
        recommended_action: issue.occurrence_count >= 5
          ? 'Consider full replacement — repair frequency indicates systemic failure'
          : 'Continue monitoring — schedule preventive maintenance',
      }, { onConflict: 'id' });

    if (!error) upserted++;
  }

  return upserted;
}

export async function getMaintenanceCostTrend(
  orgId: string,
  propertyId?: string,
  months = 12
): Promise<{ month: string; category: string; cost: number; count: number }[]> {
  const supabase = createAdminClient();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  let query = supabase
    .from('work_orders')
    .select('category, cost, created_at')
    .eq('org_id', orgId)
    .in('status', ['completed', 'closed'])
    .gte('created_at', startDate.toISOString());

  if (propertyId) query = query.eq('property_id', propertyId);

  const { data } = await query;
  if (!data) return [];

  const trend: Record<string, { cost: number; count: number }> = {};
  for (const wo of data) {
    const month = wo.created_at.slice(0, 7);
    const key = `${month}|${wo.category}`;
    if (!trend[key]) trend[key] = { cost: 0, count: 0 };
    trend[key].cost += Number(wo.cost) || 0;
    trend[key].count += 1;
  }

  return Object.entries(trend).map(([key, val]) => {
    const [month, category] = key.split('|');
    return { month, category, ...val };
  });
}
