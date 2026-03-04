// ============================================================================
// Annual Summary PDF — All-properties year overview
// ============================================================================

import type { Property, Transaction } from '@/types';

export interface AnnualSummaryData {
  properties: Property[];
  transactions: Transaction[];
  year: number;
}

export async function generateAnnualSummaryPDF(data: AnnualSummaryData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const yearTx = data.transactions.filter((t) => new Date(t.date).getFullYear() === data.year);

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
  doc.text(`Annual Summary — ${data.year}`, 20, 28);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`${data.properties.length} Properties  |  Generated: ${new Date().toLocaleDateString()}`, 20, 36);

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // ── Portfolio Totals ──
  const totalIncome = yearTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = yearTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  let y = 52;
  autoTable(doc, {
    startY: y,
    body: [
      ['Total Gross Income', fmt(totalIncome)],
      ['Total Expenses', fmt(totalExpenses)],
      ['Net Operating Income', fmt(netProfit)],
    ],
    theme: 'plain',
    margin: { left: 20, right: 20 },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 11 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (hookData) => {
      if (hookData.row.index === 0) {
        hookData.cell.styles.textColor = [22, 163, 74];
      } else if (hookData.row.index === 1) {
        hookData.cell.styles.textColor = [220, 38, 38];
      } else if (hookData.row.index === 2) {
        hookData.cell.styles.fillColor = [8, 8, 8];
        hookData.cell.styles.textColor = netProfit >= 0 ? [34, 197, 94] : [239, 68, 68];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fontSize = 12;
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // ── Per-Property Breakdown ──
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PER-PROPERTY BREAKDOWN', 24, y);

  const propertyRows = data.properties.map((p) => {
    const pTx = yearTx.filter((t) => t.property_id === p.id);
    const inc = pTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const exp = pTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return [p.address, fmt(inc), fmt(exp), fmt(inc - exp)];
  });

  autoTable(doc, {
    startY: y + 4,
    head: [['Property', 'Income', 'Expenses', 'NOI']],
    body: propertyRows,
    foot: [['TOTAL', fmt(totalIncome), fmt(totalExpenses), fmt(netProfit)]],
    theme: 'grid',
    margin: { left: 20, right: 20 },
    headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
    footStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // ── Expense Category Breakdown ──
  if (y < 220) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPENSE BREAKDOWN BY CATEGORY', 24, y);

    const catMap: Record<string, number> = {};
    yearTx.filter((t) => t.type === 'expense').forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });

    const catRows = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => [cat, fmt(amt), `${((amt / totalExpenses) * 100).toFixed(1)}%`]);

    autoTable(doc, {
      startY: y + 4,
      head: [['Category', 'Amount', '% of Total']],
      body: catRows,
      theme: 'plain',
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });
  }

  // ── Footer ──
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(8, 10, 14);
  doc.rect(0, ph - 20, pw, 20, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('This report is for informational purposes only. Consult a tax professional for official filings.', 20, ph - 10);
  doc.setTextColor(201, 168, 76);
  doc.text('RKV Consulting', pw - 20, ph - 10, { align: 'right' });

  doc.save(`rkv-annual-summary-${data.year}.pdf`);
}
