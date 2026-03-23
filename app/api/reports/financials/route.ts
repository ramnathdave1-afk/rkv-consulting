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
  const period = url.searchParams.get('period') || 'current_month'; // current_month | last_month | quarter | year

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Calculate period boundaries
  let periodStart: string;
  let periodEnd: string;

  switch (period) {
    case 'last_month': {
      const lm = new Date(currentYear, now.getMonth() - 1, 1);
      const lmEnd = new Date(currentYear, now.getMonth(), 0);
      periodStart = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`;
      periodEnd = `${lmEnd.getFullYear()}-${String(lmEnd.getMonth() + 1).padStart(2, '0')}-${lmEnd.getDate()}`;
      break;
    }
    case 'quarter': {
      const qStart = new Date(currentYear, Math.floor(now.getMonth() / 3) * 3, 1);
      periodStart = `${qStart.getFullYear()}-${String(qStart.getMonth() + 1).padStart(2, '0')}-01`;
      periodEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${now.getDate()}`;
      break;
    }
    case 'year': {
      periodStart = `${currentYear}-01-01`;
      periodEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${now.getDate()}`;
      break;
    }
    default: { // current_month
      periodStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      periodEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${now.getDate()}`;
      break;
    }
  }

  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Helper to build filtered transaction query
  function txQuery(selectFields: string) {
    let q = supabase.from('financial_transactions').select(selectFields).eq('org_id', orgId);
    if (propertyId) q = q.eq('property_id', propertyId);
    return q;
  }

  // Helper for lease queries
  function leaseQuery(selectFields: string) {
    let q = supabase.from('leases').select(selectFields).eq('org_id', orgId);
    if (propertyId) q = q.eq('property_id', propertyId);
    return q;
  }

  // Helper for unit queries
  function unitQuery(selectFields: string) {
    let q = supabase.from('units').select(selectFields).eq('org_id', orgId);
    if (propertyId) q = q.eq('property_id', propertyId);
    return q;
  }

  // Parallel queries
  const [
    incomeRes,
    expenseRes,
    unitsRes,
    activeLeasesRes,
    expiringRes,
    monthlyTrendRes,
    expenseCatsRes,
    propertyRevenueRes,
    propertiesRes,
    rentRollRes,
    propertyDetailsRes,
  ] = await Promise.all([
    // Period Income
    txQuery('amount')
      .eq('type', 'income')
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd),
    // Period Expenses
    txQuery('amount')
      .eq('type', 'expense')
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd),
    // Units for occupancy
    unitQuery('id, status, property_id'),
    // Active leases for avg rent
    leaseQuery('monthly_rent, property_id').eq('status', 'active'),
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
    // Expense categories for period
    txQuery('category, amount')
      .eq('type', 'expense')
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd),
    // Revenue by property for period
    supabase.from('financial_transactions')
      .select('amount, property_id, properties(name)')
      .eq('org_id', orgId).eq('type', 'income')
      .gte('transaction_date', periodStart)
      .lte('transaction_date', periodEnd),
    // All properties for filter dropdown
    supabase.from('properties').select('id, name').eq('org_id', orgId).order('name'),
    // Rent roll: active leases with tenant + unit + property details
    supabase.from('leases')
      .select('id, monthly_rent, lease_start, lease_end, status, deposit_amount, units(unit_number, properties(name, id)), tenants(first_name, last_name, email, phone)')
      .eq('org_id', orgId).eq('status', 'active')
      .order('monthly_rent', { ascending: false }),
    // Property details for per-property table
    supabase.from('properties').select('id, name').eq('org_id', orgId),
  ]);

  // Calculate KPIs
  const incomeData = (incomeRes.data || []) as unknown as { amount: number }[];
  const expenseData = (expenseRes.data || []) as unknown as { amount: number }[];
  const totalRevenue = incomeData.reduce((s, r) => s + Number(r.amount), 0);
  const totalExpenses = expenseData.reduce((s, r) => s + Number(r.amount), 0);
  const noi = totalRevenue - totalExpenses;

  const units = (unitsRes.data || []) as unknown as { id: string; status: string; property_id: string }[];
  const occupiedCount = units.filter((u) => u.status === 'occupied').length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedCount / units.length) * 100) : 0;

  const activeLeases = (activeLeasesRes.data || []) as unknown as { monthly_rent: number; property_id: string }[];
  const avgRent = activeLeases.length > 0
    ? Math.round(activeLeases.reduce((s, l) => s + Number(l.monthly_rent), 0) / activeLeases.length)
    : 0;

  // Delinquency: leases where rent is due but no income transaction found this month
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const { data: paidLeases } = await supabase
    .from('financial_transactions')
    .select('unit_id')
    .eq('org_id', orgId)
    .eq('type', 'income')
    .eq('category', 'rent')
    .gte('transaction_date', monthStart);

  const paidUnitIds = new Set((paidLeases || []).map((p: { unit_id: string | null }) => p.unit_id).filter(Boolean));
  const totalActiveLeases = activeLeases.length;
  const paidCount = paidUnitIds.size;
  const delinquencyRate = totalActiveLeases > 0
    ? Math.round(((totalActiveLeases - Math.min(paidCount, totalActiveLeases)) / totalActiveLeases) * 100)
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
  const propExpenseMap: Record<string, number> = {};
  const propRevData = (propertyRevenueRes.data || []) as unknown as { amount: number; property_id: string; properties: { name: string } | null }[];
  propRevData.forEach((tx) => {
    const name = tx.properties?.name || 'Unknown';
    propMap[name] = (propMap[name] || 0) + Number(tx.amount);
  });

  // Also get expenses by property for the table
  const { data: propExpenseData } = await supabase
    .from('financial_transactions')
    .select('amount, property_id, properties(name)')
    .eq('org_id', orgId).eq('type', 'expense')
    .gte('transaction_date', periodStart)
    .lte('transaction_date', periodEnd);

  const propExpRaw = (propExpenseData || []) as unknown as { amount: number; property_id: string; properties: { name: string } | null }[];
  propExpRaw.forEach((tx) => {
    const name = tx.properties?.name || 'Unknown';
    propExpenseMap[name] = (propExpenseMap[name] || 0) + Number(tx.amount);
  });

  const revenueByProperty = Object.entries(propMap)
    .map(([property_name, amount]) => ({ property_name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Build per-property table data
  const propertyDetails = (propertyDetailsRes.data || []) as unknown as { id: string; name: string }[];
  const propertyTable = propertyDetails.map((p) => {
    const propUnits = units.filter((u) => u.property_id === p.id);
    const propOccupied = propUnits.filter((u) => u.status === 'occupied').length;
    const propLeases = activeLeases.filter((l) => l.property_id === p.id);
    const propRevenue = propMap[p.name] || 0;
    const propExpense = propExpenseMap[p.name] || 0;
    return {
      property_id: p.id,
      property_name: p.name,
      total_units: propUnits.length,
      occupied_units: propOccupied,
      occupancy_rate: propUnits.length > 0 ? Math.round((propOccupied / propUnits.length) * 100) : 0,
      revenue: propRevenue,
      expenses: propExpense,
      noi: propRevenue - propExpense,
      avg_rent: propLeases.length > 0
        ? Math.round(propLeases.reduce((s, l) => s + Number(l.monthly_rent), 0) / propLeases.length)
        : 0,
    };
  });

  // Rent roll
  const rentRoll = ((rentRollRes.data || []) as unknown as {
    id: string;
    monthly_rent: number;
    lease_start: string;
    lease_end: string;
    status: string;
    deposit_amount: number | null;
    units: { unit_number: string; properties: { name: string; id: string } | null } | null;
    tenants: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  }[]).map((l) => ({
    id: l.id,
    tenant_name: l.tenants ? `${l.tenants.first_name} ${l.tenants.last_name}` : 'Vacant',
    tenant_email: l.tenants?.email || null,
    tenant_phone: l.tenants?.phone || null,
    property_name: l.units?.properties?.name || 'Unknown',
    unit_number: l.units?.unit_number || '—',
    monthly_rent: Number(l.monthly_rent),
    lease_start: l.lease_start,
    lease_end: l.lease_end,
    deposit_amount: l.deposit_amount ? Number(l.deposit_amount) : 0,
    status: l.status,
  }));

  return NextResponse.json({
    kpis: {
      total_revenue_mtd: totalRevenue,
      total_expenses_mtd: totalExpenses,
      noi_mtd: noi,
      occupancy_rate: occupancyRate,
      avg_rent_per_unit: avgRent,
      delinquency_rate: delinquencyRate,
    },
    monthly_trend: monthlyTrend,
    expense_breakdown: expenseBreakdown,
    revenue_by_property: revenueByProperty,
    property_table: propertyTable,
    expiring_leases: expiringRes.data || [],
    rent_roll: rentRoll,
    properties: (propertiesRes.data || []) as { id: string; name: string }[],
    period: { start: periodStart, end: periodEnd, label: period },
  });
}
