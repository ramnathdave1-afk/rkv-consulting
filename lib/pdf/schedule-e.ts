// ============================================================================
// Schedule E PDF — IRS rental property tax form
// ============================================================================

import type { Property, Transaction } from '@/types';

export interface ScheduleEPDFData {
  properties: Property[];
  transactions: Transaction[];
  year: number;
}

// IRS Schedule E line items mapped to transaction categories
const SCHEDULE_E_LINES: { label: string; categories: string[] }[] = [
  { label: 'Advertising', categories: ['advertising'] },
  { label: 'Auto and Travel', categories: ['travel', 'auto'] },
  { label: 'Cleaning and Maintenance', categories: ['maintenance', 'cleaning'] },
  { label: 'Commissions', categories: ['commissions'] },
  { label: 'Insurance', categories: ['insurance'] },
  { label: 'Legal and Professional Fees', categories: ['legal'] },
  { label: 'Management Fees', categories: ['management'] },
  { label: 'Mortgage Interest', categories: ['mortgage'] },
  { label: 'Taxes', categories: ['property_tax', 'tax'] },
  { label: 'Utilities', categories: ['utilities'] },
  { label: 'HOA / Other', categories: ['hoa', 'other'] },
];

export async function generateScheduleEPDF(data: ScheduleEPDFData) {
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
  doc.text(`Schedule E Summary — Tax Year ${data.year}`, 20, 28);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`${data.properties.length} Rental Properties  |  Generated: ${new Date().toLocaleDateString()}`, 20, 36);

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  let y = 48;

  // Generate per-property Schedule E
  data.properties.forEach((property, idx) => {
    if (idx > 0) {
      doc.addPage();
      y = 20;
    }

    const pTx = yearTx.filter((t) => t.property_id === property.id);
    const grossIncome = pTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Property ${idx + 1}: ${property.address}`, 20, y);
    y += 10;

    // Gross income
    doc.setFillColor(236, 253, 245);
    doc.rect(20, y - 4, pw - 40, 12, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(10);
    doc.text('Gross Rents Received (Line 3)', 24, y + 3);
    doc.text(fmt(grossIncome), pw - 24, y + 3, { align: 'right' });
    y += 16;

    // Deduction lines
    const expenses = pTx.filter((t) => t.type === 'expense');
    const lineRows: [string, string][] = [];
    let totalDeductions = 0;

    SCHEDULE_E_LINES.forEach((line) => {
      const amount = expenses
        .filter((t) => line.categories.includes(t.category))
        .reduce((s, t) => s + Number(t.amount), 0);
      if (amount > 0) {
        lineRows.push([line.label, fmt(amount)]);
        totalDeductions += amount;
      }
    });

    if (lineRows.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Deduction Category', 'Amount']],
        body: lineRows,
        foot: [['Total Deductions', fmt(totalDeductions)]],
        theme: 'plain',
        margin: { left: 24, right: 24 },
        headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
        footStyles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold', fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Net
    const netIncome = grossIncome - totalDeductions;
    doc.setFillColor(8, 8, 8);
    doc.rect(20, y, pw - 40, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Rental Income (Line 21)', 24, y + 10);
    const nc = netIncome >= 0 ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(nc[0], nc[1], nc[2]);
    doc.text(fmt(netIncome), pw - 24, y + 10, { align: 'right' });
    y += 24;
  });

  // ── Footer on last page ──
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(8, 10, 14);
  doc.rect(0, ph - 20, pw, 20, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('For informational purposes only. Consult a CPA for IRS filing.', 20, ph - 10);
  doc.setTextColor(201, 168, 76);
  doc.text('RKV Consulting', pw - 20, ph - 10, { align: 'right' });

  doc.save(`rkv-schedule-e-${data.year}.pdf`);
}
