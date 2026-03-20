/**
 * Vendor Scorecard Engine
 * Calculates response rate, completion time, tenant rating per vendor per category.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface VendorScorecard {
  vendor_id: string;
  vendor_name: string;
  company: string | null;
  jobs_assigned: number;
  jobs_completed: number;
  completion_rate: number;
  avg_response_time_hrs: number | null;
  avg_completion_time_hrs: number | null;
  avg_tenant_rating: number | null;
  total_cost: number;
  on_time_pct: number;
}

export async function calculateVendorScorecards(
  orgId: string,
  month?: number,
  year?: number
): Promise<VendorScorecard[]> {
  const supabase = createAdminClient();
  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const monthStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
  const nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // Get all vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, company')
    .eq('org_id', orgId);

  if (!vendors || vendors.length === 0) return [];

  // Get work orders for the period
  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('id, vendor_id, status, cost, created_at, completed_date, scheduled_date, tenant_rating, vendor_response_at')
    .eq('org_id', orgId)
    .not('vendor_id', 'is', null)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd);

  const scorecards: VendorScorecard[] = [];

  for (const vendor of vendors) {
    const vendorWOs = (workOrders || []).filter((wo) => wo.vendor_id === vendor.id);
    if (vendorWOs.length === 0) continue;

    const completed = vendorWOs.filter((wo) => ['completed', 'closed'].includes(wo.status));
    const rated = vendorWOs.filter((wo) => wo.tenant_rating != null);
    const withResponse = vendorWOs.filter((wo) => wo.vendor_response_at);
    const onTime = completed.filter((wo) => {
      if (!wo.scheduled_date || !wo.completed_date) return true;
      return wo.completed_date <= wo.scheduled_date;
    });

    const avgResponseHrs = withResponse.length > 0
      ? withResponse.reduce((sum, wo) => {
          const created = new Date(wo.created_at).getTime();
          const responded = new Date(wo.vendor_response_at!).getTime();
          return sum + (responded - created) / (1000 * 60 * 60);
        }, 0) / withResponse.length
      : null;

    const avgCompletionHrs = completed.length > 0
      ? completed.reduce((sum, wo) => {
          if (!wo.completed_date) return sum;
          const created = new Date(wo.created_at).getTime();
          const done = new Date(wo.completed_date).getTime();
          return sum + (done - created) / (1000 * 60 * 60);
        }, 0) / completed.length
      : null;

    scorecards.push({
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      company: vendor.company,
      jobs_assigned: vendorWOs.length,
      jobs_completed: completed.length,
      completion_rate: vendorWOs.length > 0 ? Math.round((completed.length / vendorWOs.length) * 100) : 0,
      avg_response_time_hrs: avgResponseHrs ? Math.round(avgResponseHrs * 10) / 10 : null,
      avg_completion_time_hrs: avgCompletionHrs ? Math.round(avgCompletionHrs * 10) / 10 : null,
      avg_tenant_rating: rated.length > 0
        ? Math.round(rated.reduce((s, wo) => s + (wo.tenant_rating || 0), 0) / rated.length * 10) / 10
        : null,
      total_cost: vendorWOs.reduce((s, wo) => s + (Number(wo.cost) || 0), 0),
      on_time_pct: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0,
    });
  }

  return scorecards.sort((a, b) => (b.avg_tenant_rating || 0) - (a.avg_tenant_rating || 0));
}
