import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id');
  const months = Number(url.searchParams.get('months')) || 12;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  let query = supabase
    .from('work_orders')
    .select('id, property_id, unit_id, category, cost, priority, created_at, completed_date, properties(name, unit_count)')
    .eq('org_id', profile.org_id)
    .in('status', ['completed', 'closed'])
    .gte('created_at', startDate.toISOString());

  if (propertyId) query = query.eq('property_id', propertyId);

  const { data: workOrders } = await query;
  const wos = workOrders || [];

  // Cost per category
  const byCategory: Record<string, { cost: number; count: number }> = {};
  for (const wo of wos) {
    if (!byCategory[wo.category]) byCategory[wo.category] = { cost: 0, count: 0 };
    byCategory[wo.category].cost += Number(wo.cost) || 0;
    byCategory[wo.category].count += 1;
  }

  // Cost per property
  const byProperty: Record<string, { name: string; cost: number; count: number; unit_count: number }> = {};
  for (const wo of wos) {
    if (!byProperty[wo.property_id]) {
      const prop = wo.properties as unknown as { name: string; unit_count: number } | null;
      byProperty[wo.property_id] = {
        name: prop?.name || 'Unknown',
        cost: 0,
        count: 0,
        unit_count: prop?.unit_count || 1,
      };
    }
    byProperty[wo.property_id].cost += Number(wo.cost) || 0;
    byProperty[wo.property_id].count += 1;
  }

  // Monthly trend
  const byMonth: Record<string, { cost: number; count: number }> = {};
  for (const wo of wos) {
    const month = wo.created_at.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { cost: 0, count: 0 };
    byMonth[month].cost += Number(wo.cost) || 0;
    byMonth[month].count += 1;
  }

  const totalCost = wos.reduce((s, wo) => s + (Number(wo.cost) || 0), 0);

  return NextResponse.json({
    summary: {
      total_cost: totalCost,
      total_work_orders: wos.length,
      avg_cost_per_wo: wos.length > 0 ? Math.round(totalCost / wos.length) : 0,
      period_months: months,
    },
    by_category: Object.entries(byCategory)
      .map(([category, data]) => ({ category, ...data, avg_cost: Math.round(data.cost / data.count) }))
      .sort((a, b) => b.cost - a.cost),
    by_property: Object.entries(byProperty)
      .map(([id, data]) => ({
        property_id: id,
        ...data,
        cost_per_unit: Math.round(data.cost / data.unit_count),
      }))
      .sort((a, b) => b.cost - a.cost),
    monthly_trend: Object.entries(byMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  });
}
