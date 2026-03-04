// ============================================================================
// Property P&L PDF — Per-property profit & loss with monthly breakdown
// ============================================================================

import type { Property, Transaction } from '@/types';

export interface PropertyPLData {
  property: Property;
  transactions: Transaction[];
  startDate: string;
  endDate: string;
}

export async function generatePropertyPLPDF(data: PropertyPLData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF('landscape');
  const pw = doc.internal.pageSize.getWidth();
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  // ── Header ──
  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, pw, 35, 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RKV CONSULTING', 20, 16);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Property P&L: ${data.property.address}`, 20, 25);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Period: ${start.toLocaleDateString()} — ${end.toLocaleDateString()}  |  Generated: ${new Date().toLocaleDateString()}`, 20, 32);

  // Build monthly buckets
  const months: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push(cursor.toLocaleString('default', { month: 'short', year: '2-digit' }));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Group transactions by month and category
  const incomeCategories = new Set<string>();
  const expenseCategories = new Set<string>();
  const incomeMap: Record<string, Record<string, number>> = {};
  const expenseMap: Record<string, Record<string, number>> = {};

  data.transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!months.includes(key)) return;

    if (tx.type === 'income') {
      incomeCategories.add(tx.category);
      if (!incomeMap[tx.category]) incomeMap[tx.category] = {};
      incomeMap[tx.category][key] = (incomeMap[tx.category][key] || 0) + Number(tx.amount);
    } else {
      expenseCategories.add(tx.category);
      if (!expenseMap[tx.category]) expenseMap[tx.category] = {};
      expenseMap[tx.category][key] = (expenseMap[tx.category][key] || 0) + Number(tx.amount);
    }
  });

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Build table rows
  const head = [['Category', ...months, 'Total']];
  const body: (string | number)[][] = [];

  // Income section
  body.push([{ content: 'INCOME', colSpan: months.length + 2, styles: { fillColor: [236, 253, 245], textColor: [22, 163, 74], fontStyle: 'bold' } } as unknown as string]);
  Array.from(incomeCategories).forEach((cat) => {
    const row: (string | number)[] = [cat];
    let total = 0;
    months.forEach((m) => {
      const val = incomeMap[cat]?.[m] || 0;
      total += val;
      row.push(val ? fmt(val) : '—');
    });
    row.push(fmt(total));
    body.push(row);
  });

  // Income totals
  const incomeTotalRow: (string | number)[] = ['Total Income'];
  let grandIncome = 0;
  months.forEach((m) => {
    let monthTotal = 0;
    Array.from(incomeCategories).forEach((cat) => { monthTotal += incomeMap[cat]?.[m] || 0; });
    grandIncome += monthTotal;
    incomeTotalRow.push(fmt(monthTotal));
  });
  incomeTotalRow.push(fmt(grandIncome));
  body.push(incomeTotalRow);

  // Expense section
  body.push([{ content: 'EXPENSES', colSpan: months.length + 2, styles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' } } as unknown as string]);
  Array.from(expenseCategories).forEach((cat) => {
    const row: (string | number)[] = [cat];
    let total = 0;
    months.forEach((m) => {
      const val = expenseMap[cat]?.[m] || 0;
      total += val;
      row.push(val ? fmt(val) : '—');
    });
    row.push(fmt(total));
    body.push(row);
  });

  // Expense totals
  const expenseTotalRow: (string | number)[] = ['Total Expenses'];
  let grandExpenses = 0;
  months.forEach((m) => {
    let monthTotal = 0;
    Array.from(expenseCategories).forEach((cat) => { monthTotal += expenseMap[cat]?.[m] || 0; });
    grandExpenses += monthTotal;
    expenseTotalRow.push(fmt(monthTotal));
  });
  expenseTotalRow.push(fmt(grandExpenses));
  body.push(expenseTotalRow);

  // NOI row
  const noiRow: (string | number)[] = ['NET OPERATING INCOME'];
  let noiTotal = 0;
  months.forEach((m) => {
    let inc = 0, exp = 0;
    Array.from(incomeCategories).forEach((cat) => { inc += incomeMap[cat]?.[m] || 0; });
    Array.from(expenseCategories).forEach((cat) => { exp += expenseMap[cat]?.[m] || 0; });
    const noi = inc - exp;
    noiTotal += noi;
    noiRow.push(fmt(noi));
  });
  noiRow.push(fmt(noiTotal));
  body.push(noiRow);

  autoTable(doc, {
    startY: 42,
    head,
    body,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 7 },
    columnStyles: (() => {
      const styles: Record<number, { halign: 'right'; fontStyle?: 'bold' }> = {};
      months.forEach((_, i) => { styles[i + 1] = { halign: 'right' }; });
      styles[months.length + 1] = { halign: 'right', fontStyle: 'bold' };
      return styles;
    })(),
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const rowData = hookData.row.raw as (string | number)[];
        const firstCell = typeof rowData[0] === 'string' ? rowData[0] : '';
        if (firstCell === 'Total Income' || firstCell === 'Total Expenses') {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [245, 245, 245];
        }
        if (firstCell === 'NET OPERATING INCOME') {
          hookData.cell.styles.fillColor = [8, 8, 8];
          hookData.cell.styles.textColor = noiTotal >= 0 ? [34, 197, 94] : [239, 68, 68];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ── Footer ──
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(8, 10, 14);
  doc.rect(0, ph - 16, pw, 16, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text('This report is for informational purposes only.', 20, ph - 7);
  doc.setTextColor(201, 168, 76);
  doc.text('RKV Consulting', pw - 20, ph - 7, { align: 'right' });

  const safeName = data.property.address.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
  doc.save(`rkv-property-pl-${safeName}.pdf`);
}
