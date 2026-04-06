interface OwnerReportData {
  orgName: string;
  propertyName: string;
  propertyAddress: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  generatedDate: string;
  totalIncome: number;
  totalExpenses: number;
  noi: number;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  incomeBreakdown: { category: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
  aiSummary: string;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ownerReportHTML(data: OwnerReportData): string {
  const incomeRows = data.incomeBreakdown.map((item) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${item.category.replace('_', ' ')}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">${formatCurrency(item.amount)}</td></tr>`
  ).join('');

  const expenseRows = data.expenseBreakdown.map((item) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${item.category.replace('_', ' ')}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">${formatCurrency(item.amount)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1F2937; font-size: 13px; line-height: 1.5; }
    .header { background: #0F1117; color: white; padding: 32px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 20px; font-weight: 700; }
    .header .meta { text-align: right; font-size: 11px; color: #9CA3AF; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 24px 32px; }
    .kpi { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; text-align: center; }
    .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; }
    .kpi .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .section { padding: 16px 32px; }
    .section h2 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F3F4F6; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6B7280; }
    .summary { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 0 32px 24px; }
    .summary h3 { font-size: 12px; font-weight: 600; color: #166534; margin-bottom: 8px; }
    .summary p { font-size: 12px; color: #374151; line-height: 1.6; }
    .footer { border-top: 1px solid #E5E7EB; padding: 16px 32px; text-align: center; font-size: 10px; color: #9CA3AF; }
    .accent { color: #00D4AA; }
    .green { color: #16A34A; }
    .red { color: #DC2626; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Owner Report</h1>
      <div style="font-size:16px;margin-top:4px;">${data.propertyName}</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:2px;">${data.propertyAddress}</div>
    </div>
    <div class="meta">
      <div>${data.reportType.charAt(0).toUpperCase() + data.reportType.slice(1)} Report</div>
      <div>${data.periodStart} — ${data.periodEnd}</div>
      <div>Generated: ${data.generatedDate}</div>
      <div style="margin-top:8px;color:#00D4AA;font-weight:600;">RKV Consulting</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="label">Total Income</div>
      <div class="value green">${formatCurrency(data.totalIncome)}</div>
    </div>
    <div class="kpi">
      <div class="label">Total Expenses</div>
      <div class="value red">${formatCurrency(data.totalExpenses)}</div>
    </div>
    <div class="kpi">
      <div class="label">Net Operating Income</div>
      <div class="value" style="color:${data.noi >= 0 ? '#16A34A' : '#DC2626'}">${formatCurrency(data.noi)}</div>
    </div>
    <div class="kpi">
      <div class="label">Occupancy</div>
      <div class="value">${data.occupancyRate}%</div>
      <div style="font-size:10px;color:#6B7280;">${data.occupiedUnits} / ${data.totalUnits} units</div>
    </div>
  </div>

  ${data.aiSummary ? `
  <div class="summary">
    <h3>Executive Summary</h3>
    <p>${data.aiSummary}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2>Income Breakdown</h2>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>
        ${incomeRows || '<tr><td colspan="2" style="padding:12px;text-align:center;color:#9CA3AF;">No income recorded</td></tr>'}
        <tr style="font-weight:700;background:#F0FDF4;">
          <td style="padding:8px 12px;">Total Income</td>
          <td style="padding:8px 12px;text-align:right;">${formatCurrency(data.totalIncome)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Expense Breakdown</h2>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
      <tbody>
        ${expenseRows || '<tr><td colspan="2" style="padding:12px;text-align:center;color:#9CA3AF;">No expenses recorded</td></tr>'}
        <tr style="font-weight:700;background:#FEF2F2;">
          <td style="padding:8px 12px;">Total Expenses</td>
          <td style="padding:8px 12px;text-align:right;">${formatCurrency(data.totalExpenses)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>${data.orgName} &middot; Powered by RKV Consulting &middot; Generated ${data.generatedDate}</p>
  </div>
</body>
</html>`;
}
