// ============================================================================
// Owner Statement PDF — Monthly per-property income/expense/distribution
// ============================================================================

import type { Property, Transaction, Tenant } from '@/types';

export interface OwnerStatementData {
  property: Property;
  tenants: Tenant[];
  transactions: Transaction[];
  month: number;
  year: number;
  managementFeePct?: number;
}

export async function generateOwnerStatementPDF(data: OwnerStatementData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const monthName = new Date(data.year, data.month).toLocaleString('default', { month: 'long', year: 'numeric' });
  const mgmtPct = data.managementFeePct ?? 0.08;

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
  doc.text('Owner Statement', 20, 28);
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 36);

  // ── Property & Period ──
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Property: ${data.property.address}`, 20, 52);
  doc.text(`Period: ${monthName}`, 20, 60);

  // Filter transactions to this month
  const monthTx = data.transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d.getMonth() === data.month && d.getFullYear() === data.year;
  });

  const income = monthTx.filter((t) => t.type === 'income');
  const expenses = monthTx.filter((t) => t.type === 'expense');
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const mgmtFee = totalIncome * mgmtPct;
  const netToOwner = totalIncome - totalExpenses - mgmtFee;

  // ── Tenants ──
  let y = 72;
  if (data.tenants.length > 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CURRENT TENANTS', 24, y);

    autoTable(doc, {
      startY: y + 4,
      head: [['Tenant', 'Monthly Rent', 'Lease End']],
      body: data.tenants.map((t) => [
        `${t.first_name} ${t.last_name}`,
        `$${Number(t.monthly_rent).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        t.lease_end || '—',
      ]),
      theme: 'plain',
      margin: { left: 24, right: 24 },
      headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Income ──
  doc.setFillColor(236, 253, 245);
  doc.rect(20, y - 4, pw - 40, 12, 'F');
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INCOME', 24, y + 3);
  doc.text(`$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pw - 24, y + 3, { align: 'right' });

  if (income.length > 0) {
    autoTable(doc, {
      startY: y + 12,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: income.map((t) => [
        new Date(t.date).toLocaleDateString(),
        t.category,
        t.description || '—',
        `$${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      ]),
      theme: 'plain',
      margin: { left: 24, right: 24 },
      headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 8 },
      columnStyles: { 3: { halign: 'right' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    y += 20;
  }

  // ── Expenses ──
  doc.setFillColor(254, 242, 242);
  doc.rect(20, y - 4, pw - 40, 12, 'F');
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPENSES', 24, y + 3);
  doc.text(`$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pw - 24, y + 3, { align: 'right' });

  if (expenses.length > 0) {
    autoTable(doc, {
      startY: y + 12,
      head: [['Date', 'Category', 'Description', 'Amount']],
      body: expenses.map((t) => [
        new Date(t.date).toLocaleDateString(),
        t.category,
        t.description || '—',
        `$${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      ]),
      theme: 'plain',
      margin: { left: 24, right: 24 },
      headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 8 },
      columnStyles: { 3: { halign: 'right' } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    y += 20;
  }

  // ── Summary ──
  autoTable(doc, {
    startY: y,
    body: [
      ['Gross Income', `$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      ['Less: Expenses', `($${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })})`],
      [`Less: Management Fee (${(mgmtPct * 100).toFixed(0)}%)`, `($${mgmtFee.toLocaleString(undefined, { minimumFractionDigits: 2 })})`],
      ['Net Distribution to Owner', `$${netToOwner.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
    ],
    theme: 'plain',
    margin: { left: 24, right: 24 },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 10 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (hookData) => {
      if (hookData.row.index === 3) {
        hookData.cell.styles.fillColor = [8, 8, 8];
        hookData.cell.styles.textColor = hookData.column.index === 1
          ? (netToOwner >= 0 ? [34, 197, 94] : [239, 68, 68])
          : [255, 255, 255];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Footer ──
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(8, 10, 14);
  doc.rect(0, ph - 20, pw, 20, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('This report is for informational purposes only.', 20, ph - 10);
  doc.setTextColor(201, 168, 76);
  doc.text('RKV Consulting', pw - 20, ph - 10, { align: 'right' });

  const safeName = data.property.address.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
  doc.save(`rkv-owner-statement-${safeName}-${monthName.replace(/\s/g, '-').toLowerCase()}.pdf`);
}
