// ============================================================================
// Tax Report PDF Generation
// Ported from /Users/daveramnath/rkv-dashhub/frontend/src/lib/generateTaxPDF.ts
// Restyled with RKV Consulting brand colors
// ============================================================================

import type { TaxReportData } from '@/types';

export async function generateTaxReportPDF(report: TaxReportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header: RKV Consulting Brand ──
  doc.setFillColor(8, 10, 14); // #080A0E
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(201, 168, 76); // Gold #C9A84C
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RKV CONSULTING', 20, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Property Tax Report', 20, 28);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 36);

  // ── Property & Year Info ──
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Property: ${report.propertyName}`, 20, 52);
  doc.text(`Tax Year: ${report.year}`, 20, 60);
  if (report.propertyAddress) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(report.propertyAddress, 20, 67);
  }

  // ── Gross Income ──
  let y = report.propertyAddress ? 78 : 72;
  doc.setFillColor(236, 253, 245);
  doc.rect(20, y - 6, pageWidth - 40, 12, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('GROSS RENTAL INCOME', 24, y);
  doc.text(
    `$${report.grossIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    pageWidth - 24,
    y,
    { align: 'right' }
  );

  // ── Deductions Table ──
  y += 16;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DEDUCTIBLE EXPENSES (Schedule E)', 24, y);

  const deductionRows = report.deductions
    .filter((d) => d.amount > 0)
    .map((d) => [d.label, `$${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]);

  if (deductionRows.length > 0) {
    autoTable(doc, {
      startY: y + 4,
      head: [['Category', 'Amount']],
      body: deductionRows,
      theme: 'plain',
      margin: { left: 24, right: 24 },
      headStyles: {
        fillColor: [17, 22, 32], // #111620
        textColor: [201, 168, 76], // Gold
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── Total Deductions ──
  doc.setFillColor(254, 242, 242);
  doc.rect(20, y, pageWidth - 40, 12, 'F');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DEDUCTIONS', 24, y + 8);
  doc.text(
    `$${report.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    pageWidth - 24,
    y + 8,
    { align: 'right' }
  );

  // ── Net Taxable Income ──
  y += 20;
  doc.setFillColor(8, 10, 14); // #080A0E
  doc.rect(20, y, pageWidth - 40, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET TAXABLE INCOME', 24, y + 10);
  const netColor = report.netTaxableIncome >= 0 ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(netColor[0], netColor[1], netColor[2]);
  doc.text(
    `$${report.netTaxableIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    pageWidth - 24,
    y + 10,
    { align: 'right' }
  );

  // ── Depreciation Section ──
  if (report.depreciation) {
    y += 24;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DEPRECIATION (27.5 Year Straight-Line)', 24, y);

    autoTable(doc, {
      startY: y + 4,
      head: [['Item', 'Basis', 'Annual Deduction', 'Accumulated']],
      body: [
        [
          'Building (excl. land)',
          `$${report.depreciation.depreciableBasis.toLocaleString()}`,
          `$${report.depreciation.annualDepreciation.toLocaleString()}`,
          `$${report.depreciation.accumulatedDepreciation.toLocaleString()}`,
        ],
      ],
      theme: 'plain',
      margin: { left: 24, right: 24 },
      headStyles: {
        fillColor: [17, 22, 32],
        textColor: [201, 168, 76],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── Capital Expenses ──
  if (report.capitalExpenses && report.capitalExpenses.length > 0) {
    y += 8;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CAPITAL EXPENSES (Depreciated per IRS guidelines)', 24, y);

    const capRows = report.capitalExpenses.map((c) => [
      c.description,
      `$${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    ]);

    const totalCapital = report.capitalExpenses.reduce((s, c) => s + c.amount, 0);

    autoTable(doc, {
      startY: y + 4,
      head: [['Description', 'Amount']],
      body: capRows,
      foot: [
        ['Total', `$${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      ],
      theme: 'plain',
      margin: { left: 24, right: 24 },
      headStyles: {
        fillColor: [17, 22, 32],
        textColor: [201, 168, 76],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      footStyles: {
        fillColor: [17, 22, 32],
        textColor: [201, 168, 76],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: { 1: { halign: 'right' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ── YoY Comparison ──
  if (report.comparison && report.comparison.prevIncome > 0) {
    y += 8;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('YEAR-OVER-YEAR COMPARISON', 24, y);

    autoTable(doc, {
      startY: y + 4,
      head: [['Metric', String(report.comparison.prevYear), String(report.year)]],
      body: [
        [
          'Gross Income',
          `$${report.comparison.prevIncome.toLocaleString()}`,
          `$${report.grossIncome.toLocaleString()}`,
        ],
        [
          'Deductions',
          `$${report.comparison.prevDeductions.toLocaleString()}`,
          `$${report.totalDeductions.toLocaleString()}`,
        ],
        [
          'Net Income',
          `$${report.comparison.prevNet.toLocaleString()}`,
          `$${report.netTaxableIncome.toLocaleString()}`,
        ],
      ],
      theme: 'grid',
      margin: { left: 24, right: 24 },
      headStyles: {
        fillColor: [17, 22, 32],
        textColor: [201, 168, 76],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });
  }

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(8, 10, 14);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'This report is for informational purposes only. Consult a tax professional for official filings.',
    20,
    pageHeight - 10
  );
  doc.setTextColor(201, 168, 76);
  doc.text('RKV Consulting', pageWidth - 20, pageHeight - 10, { align: 'right' });

  // Save
  const safeName = report.propertyName.replace(/\s+/g, '-').toLowerCase();
  doc.save(`rkv-tax-report-${safeName}-${report.year}.pdf`);
}
