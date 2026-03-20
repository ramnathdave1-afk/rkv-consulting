import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePDF } from '@/lib/pdf/generate';
import { ownerReportHTML } from '@/lib/pdf/templates/owner-report';
import { callClaude } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { property_id, report_type, period_start, period_end } = await request.json();
  if (!property_id || !report_type || !period_start || !period_end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  const orgId = profile.org_id;

  // Get property details
  const { data: property } = await admin.from('properties').select('name, address_line1, city, state, zip').eq('id', property_id).single();
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  // Get org name
  const { data: org } = await admin.from('organizations').select('name').eq('id', orgId).single();

  // Get units for occupancy
  const { data: units } = await admin.from('units').select('status').eq('property_id', property_id);
  const totalUnits = units?.length || 0;
  const occupiedUnits = units?.filter((u: { status: string }) => u.status === 'occupied').length || 0;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Get financial transactions for the period
  const { data: transactions } = await admin
    .from('financial_transactions')
    .select('type, category, amount')
    .eq('property_id', property_id)
    .eq('org_id', orgId)
    .gte('transaction_date', period_start)
    .lte('transaction_date', period_end);

  const incomeMap: Record<string, number> = {};
  const expenseMap: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpenses = 0;

  (transactions || []).forEach((tx: { type: string; category: string; amount: number }) => {
    const amount = Number(tx.amount);
    if (tx.type === 'income') {
      incomeMap[tx.category] = (incomeMap[tx.category] || 0) + amount;
      totalIncome += amount;
    } else {
      expenseMap[tx.category] = (expenseMap[tx.category] || 0) + amount;
      totalExpenses += amount;
    }
  });

  // Generate AI summary
  let aiSummary = '';
  try {
    const summaryResult = await callClaude(
      [{ role: 'user', content: `Generate a 2-3 sentence executive summary for a property owner report.

Property: ${property.name} at ${property.address_line1}, ${property.city}, ${property.state}
Period: ${period_start} to ${period_end}
Total Income: $${totalIncome.toLocaleString()}
Total Expenses: $${totalExpenses.toLocaleString()}
NOI: $${(totalIncome - totalExpenses).toLocaleString()}
Occupancy: ${occupancyRate}% (${occupiedUnits}/${totalUnits} units)

Write a professional, concise summary highlighting key performance and any notable trends. Do not make up data.` }],
      'You are a property management financial analyst. Write concise, professional owner report summaries.'
    );

    if (aiSummary !== null && !('error' in summaryResult)) {
      const content = summaryResult.content;
      aiSummary = Array.isArray(content)
        ? content.map((b: { text?: string }) => b.text || '').join('')
        : typeof content === 'string' ? content : '';
    }
  } catch {
    aiSummary = '';
  }

  // Generate HTML
  const html = ownerReportHTML({
    orgName: org?.name || 'Property Management Company',
    propertyName: property.name,
    propertyAddress: `${property.address_line1}, ${property.city}, ${property.state} ${property.zip}`,
    reportType: report_type,
    periodStart: period_start,
    periodEnd: period_end,
    generatedDate: new Date().toLocaleDateString(),
    totalIncome,
    totalExpenses,
    noi: totalIncome - totalExpenses,
    occupancyRate,
    totalUnits,
    occupiedUnits,
    incomeBreakdown: Object.entries(incomeMap).map(([category, amount]) => ({ category, amount })),
    expenseBreakdown: Object.entries(expenseMap).map(([category, amount]) => ({ category, amount })),
    aiSummary,
  });

  // Generate PDF
  const pdfBuffer = await generatePDF(html);

  // Upload to Supabase Storage
  const reportId = crypto.randomUUID();
  const storagePath = `${orgId}/${property_id}/${reportId}.pdf`;

  const { error: uploadError } = await admin.storage
    .from('owner-reports')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf' });

  let pdfUrl = null;
  if (!uploadError) {
    const { data: urlData } = admin.storage.from('owner-reports').getPublicUrl(storagePath);
    pdfUrl = urlData.publicUrl;
  }

  // Insert report record
  const { data: report, error: insertError } = await admin
    .from('owner_reports')
    .insert({
      org_id: orgId,
      property_id,
      report_type,
      period_start,
      period_end,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_operating_income: totalIncome - totalExpenses,
      occupancy_rate: occupancyRate,
      ai_summary: aiSummary,
      data: { income_breakdown: incomeMap, expense_breakdown: expenseMap },
      pdf_url: pdfUrl,
      generated_by: user.id,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ report, pdf_url: pdfUrl }, { status: 201 });
}
