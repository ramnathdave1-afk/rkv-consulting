// ============================================================================
// Cash Flow Statement PDF — Operating, investing, financing activities
// ============================================================================

import type { Property, Transaction } from '@/types';

export interface CashFlowData {
  properties: Property[];
  transactions: Transaction[];
  startDate: string;
  endDate: string;
}

export async function generateCashFlowPDF(data: CashFlowData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  const txs = data.transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  // ── Header ──
  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, pw, 40, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RKV CONSULTING', 20, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Cash Flow Statement', 20, 28);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Period: ${start.toLocaleDateString()} — ${end.toLocaleDateString()}  |  Generated: ${new Date().toLocaleDateString()}`, 20, 36);

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Categorize
  const operatingIncome = txs.filter((t) => t.type === 'income');
  const operatingExpCategories = ['maintenance', 'utilities', 'insurance', 'property_tax', 'management', 'advertising', 'legal', 'hoa', 'cleaning'];
  const operatingExpenses = txs.filter((t) => t.type === 'expense' && operatingExpCategories.includes(t.category));
  const mortgagePayments = txs.filter((t) => t.type === 'expense' && t.category === 'mortgage');
  const capitalExpenses = txs.filter((t) => t.type === 'expense' && !operatingExpCategories.includes(t.category) && t.category !== 'mortgage');

  const totalOpIncome = operatingIncome.reduce((s, t) => s + Number(t.amount), 0);
  const totalOpExpenses = operatingExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalMortgage = mortgagePayments.reduce((s, t) => s + Number(t.amount), 0);
  const totalCapital = capitalExpenses.reduce((s, t) => s + Number(t.amount), 0);

  const noi = totalOpIncome - totalOpExpenses;
  const netCashFlow = noi - totalMortgage - totalCapital;

  let y = 52;

  // ── Operating Activities ──
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('OPERATING ACTIVITIES', 24, y);

  autoTable(doc, {
    startY: y + 4,
    body: [
      ['Rental Income', fmt(totalOpIncome)],
      ['Operating Expenses', `(${fmt(totalOpExpenses)})`],
      ['Net Operating Income (NOI)', fmt(noi)],
    ],
    theme: 'plain',
    margin: { left: 24, right: 24 },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (hookData) => {
      if (hookData.row.index === 2) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [245, 245, 245];
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Investing Activities ──
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INVESTING ACTIVITIES', 24, y);

  autoTable(doc, {
    startY: y + 4,
    body: [
      ['Capital Expenditures', `(${fmt(totalCapital)})`],
      ['Net Investing Activities', `(${fmt(totalCapital)})`],
    ],
    theme: 'plain',
    margin: { left: 24, right: 24 },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (hookData) => {
      if (hookData.row.index === 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [245, 245, 245];
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Financing Activities ──
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCING ACTIVITIES', 24, y);

  autoTable(doc, {
    startY: y + 4,
    body: [
      ['Mortgage Payments', `(${fmt(totalMortgage)})`],
      ['Net Financing Activities', `(${fmt(totalMortgage)})`],
    ],
    theme: 'plain',
    margin: { left: 24, right: 24 },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (hookData) => {
      if (hookData.row.index === 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [245, 245, 245];
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Net Cash Flow ──
  doc.setFillColor(8, 8, 8);
  doc.rect(20, y, pw - 40, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET CASH FLOW', 24, y + 11);
  const clr = netCashFlow >= 0 ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(clr[0], clr[1], clr[2]);
  doc.text(fmt(netCashFlow), pw - 24, y + 11, { align: 'right' });

  // ── Footer ──
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(8, 10, 14);
  doc.rect(0, ph - 20, pw, 20, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('This report is for informational purposes only.', 20, ph - 10);
  doc.setTextColor(201, 168, 76);
  doc.text('RKV Consulting', pw - 20, ph - 10, { align: 'right' });

  doc.save(`rkv-cash-flow-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.pdf`);
}
