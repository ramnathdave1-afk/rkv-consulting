import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const orgId = profile.org_id;
  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Helper to build filtered transaction query
  function txQuery(selectFields: string) {
    let q = supabase.from('financial_transactions').select(selectFields).eq('org_id', orgId);
    if (propertyId) q = q.eq('property_id', propertyId);
    return q;
  }

  // Parallel queries
  const [incomeRes, expenseRes, unitsRes, activeLeasesRes, expiringRes, monthlyTrendRes, expenseCatsRes, propertyRevenueRes] = await Promise.all([
    // MTD Income
    txQuery('amount')
      .eq('type', 'income')
      .gte('transaction_date', monthStart),
    // MTD Expenses
    txQuery('amount')
      .eq('type', 'expense')
      .gte('transaction_date', monthStart),
    // Units for occupancy
    supabase.from('units').select('id, status').eq('org_id', orgId),
    // Active leases for avg rent
    supabase.from('leases').select('monthly_rent').eq('org_id', orgId).eq('status', 'active'),
    // Expiring leases in 90 days
    supabase.from('leases')
      .select('id, lease_start, lease_end, monthly_rent, status, units(unit_number, properties(name)), tenants(first_name, last_name)')
      .eq('org_id', orgId).eq('status', 'active').lte('lease_end', in90Days)
      .order('lease_end', { ascending: true }),
    // 12-month trend
    supabase.from('financial_transactions')
      .select('type, amount, period_month, period_year')
      .eq('org_id', orgId)
      .gte('transaction_date', new Date(currentYear - 1, currentMonth - 1, 1).toISOString().split('T')[0]),
    // Expense categories MTD
    supabase.from('financial_transactions')
      .select('category, amount')
      .eq('org_id', orgId).eq('type', 'expense')
      .gte('transaction_date', monthStart),
    // Revenue by property
    supabase.from('financial_transactions')
      .select('amount, properties(name)')
      .eq('org_id', orgId).eq('type', 'income')
      .gte('transaction_date', monthStart),
  ]);

  // Calculate KPIs
  const incomeData = (incomeRes.data || []) as unknown as { amount: number }[];
  const expenseData = (expenseRes.data || []) as unknown as { amount: number }[];
  const totalRevenueMtd = incomeData.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpensesMtd = expenseData.reduce((s, r) => s + Number(r.amount), 0);
  const noiMtd = totalRevenueMtd - totalExpensesMtd;

  const units = (unitsRes.data || []) as unknown as { id: string; status: string }[];
  const occupiedCount = units.filter((u) => u.status === 'occupied').length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedCount / units.length) * 100) : 0;

  const activeLeases = (activeLeasesRes.data || []) as unknown as { monthly_rent: number }[];
  const avgRent = activeLeases.length > 0
    ? Math.round(activeLeases.reduce((s, l) => s + Number(l.monthly_rent), 0) / activeLeases.length)
    : 0;

  // Monthly trend aggregation
  const trendMap: Record<string, { income: number; expenses: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    trendMap[key] = { income: 0, expenses: 0 };
  }
  const trendData = (monthlyTrendRes.data || []) as unknown as { type: string; amount: number; period_month: number; period_year: number }[];
  trendData.forEach((tx) => {
    const key = `${tx.period_year}-${String(tx.period_month).padStart(2, '0')}`;
    if (trendMap[key]) {
      if (tx.type === 'income') trendMap[key].income += Number(tx.amount);
      else trendMap[key].expenses += Number(tx.amount);
    }
  });
  const monthlyTrend = Object.entries(trendMap).map(([month, data]) => ({ month, ...data }));

  // Expense breakdown
  const expenseMap: Record<string, number> = {};
  const expenseCats = (expenseCatsRes.data || []) as unknown as { category: string; amount: number }[];
  expenseCats.forEach((tx) => {
    expenseMap[tx.category] = (expenseMap[tx.category] || 0) + Number(tx.amount);
  });
  const expenseBreakdown = Object.entries(expenseMap).map(([category, amount]) => ({ category, amount }));

  // Revenue by property
  const propMap: Record<string, number> = {};
  const propRevData = (propertyRevenueRes.data || []) as unknown as { amount: number; properties: { name: string } | null }[];
  propRevData.forEach((tx) => {
    const name = tx.properties?.name || 'Unknown';
    propMap[name] = (propMap[name] || 0) + Number(tx.amount);
  });
  const revenueByProperty = Object.entries(propMap)
    .map(([property_name, amount]) => ({ property_name, amount }))
    .sort((a, b) => b.amount - a.amount);

  return NextResponse.json({
    kpis: {
      total_revenue_mtd: totalRevenueMtd,
      total_expenses_mtd: totalExpensesMtd,
      noi_mtd: noiMtd,
      occupancy_rate: occupancyRate,
      avg_rent_per_unit: avgRent,
      delinquency_rate: 0, // TODO: calculate based on missing rent payments
    },
    monthly_trend: monthlyTrend,
    expense_breakdown: expenseBreakdown,
    revenue_by_property: revenueByProperty,
    expiring_leases: expiringRes.data || [],
    rent_roll: activeLeases,
  });
}
