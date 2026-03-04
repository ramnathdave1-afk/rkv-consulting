// ============================================================================
// Rent Roll PDF — Tenant roster with lease terms and payment status
// ============================================================================

import type { Property, Tenant, Transaction } from '@/types';

export interface RentRollData {
  properties: Property[];
  tenants: Tenant[];
  transactions: Transaction[];
}

export async function generateRentRollPDF(data: RentRollData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF('landscape');
  const pw = doc.internal.pageSize.getWidth();

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
  doc.text('Rent Roll Report', 20, 25);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${data.tenants.length} Tenants across ${data.properties.length} Properties  |  Generated: ${new Date().toLocaleDateString()}`, 20, 32);

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // Build property lookup
  const propMap: Record<string, Property> = {};
  data.properties.forEach((p) => { propMap[p.id] = p; });

  // Find last rent payment per tenant
  const lastPayment: Record<string, string> = {};
  data.transactions
    .filter((t) => t.type === 'income' && t.category === 'rent' && t.tenant_id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((t) => {
      if (t.tenant_id && !lastPayment[t.tenant_id]) {
        lastPayment[t.tenant_id] = new Date(t.date).toLocaleDateString();
      }
    });

  const totalRent = data.tenants.reduce((s, t) => s + Number(t.monthly_rent || 0), 0);
  const activeTenants = data.tenants.filter((t) => t.status === 'active');

  // Summary cards
  const y = 42;
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.text(`Total Monthly Rent: ${fmt(totalRent)}    |    Active Tenants: ${activeTenants.length}    |    Occupancy: ${data.properties.length > 0 ? ((activeTenants.length / data.properties.length) * 100).toFixed(0) : 0}%`, 24, y);

  // ── Table ──
  const rows = data.tenants.map((t) => {
    const prop = t.property_id ? propMap[t.property_id] : null;
    const daysToExpiry = t.lease_end ? Math.ceil((new Date(t.lease_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const expiryText = daysToExpiry !== null
      ? (daysToExpiry < 0 ? 'Expired' : daysToExpiry <= 30 ? `${daysToExpiry}d` : t.lease_end || '—')
      : '—';

    return [
      prop?.address || '—',
      `${t.first_name} ${t.last_name}`,
      t.status === 'active' ? 'Active' : t.status,
      t.lease_start || '—',
      expiryText,
      fmt(Number(t.monthly_rent || 0)),
      fmt(Number(t.security_deposit || 0)),
      lastPayment[t.id] || '—',
    ];
  });

  autoTable(doc, {
    startY: y + 6,
    head: [['Property', 'Tenant', 'Status', 'Lease Start', 'Lease End', 'Monthly Rent', 'Deposit', 'Last Payment']],
    body: rows,
    foot: [['', '', '', '', 'TOTAL', fmt(totalRent), '', '']],
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 7 },
    footStyles: { fillColor: [17, 17, 17], textColor: [201, 168, 76], fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const val = hookData.cell.raw as string;
        if (val === 'Active') hookData.cell.styles.textColor = [22, 163, 74];
        else hookData.cell.styles.textColor = [220, 38, 38];
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

  doc.save(`rkv-rent-roll-${new Date().toISOString().slice(0, 10)}.pdf`);
}
