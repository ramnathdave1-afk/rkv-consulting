import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import type { ImportEntity } from '@/lib/import/csv-parser';

const TEMPLATES: Record<ImportEntity, { headers: string[]; sample: string[] }> = {
  properties: {
    headers: [
      'name',
      'address_line1',
      'address_line2',
      'city',
      'state',
      'zip',
      'property_type',
      'unit_count',
      'year_built',
    ],
    sample: [
      'Sunset Apartments',
      '123 Main St',
      '',
      'Phoenix',
      'AZ',
      '85001',
      'multifamily',
      '24',
      '1998',
    ],
  },
  units: {
    headers: [
      'property_name',
      'unit_number',
      'bedrooms',
      'bathrooms',
      'square_footage',
      'market_rent',
      'status',
      'floor_plan',
    ],
    sample: ['Sunset Apartments', '101', '2', '1', '850', '1500', 'vacant', 'A1'],
  },
  tenants: {
    headers: [
      'first_name',
      'last_name',
      'email',
      'phone',
      'status',
      'move_in_date',
      'move_out_date',
    ],
    sample: [
      'Jane',
      'Doe',
      'jane@example.com',
      '555-123-4567',
      'active',
      '2025-06-01',
      '',
    ],
  },
  leases: {
    headers: [
      'tenant_name',
      'unit_number',
      'property_name',
      'lease_start',
      'lease_end',
      'monthly_rent',
      'security_deposit',
      'status',
    ],
    sample: [
      'Jane Doe',
      '101',
      'Sunset Apartments',
      '2025-06-01',
      '2026-05-31',
      '1500',
      '1500',
      'active',
    ],
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  // Auth check — keeps templates behind login (consistent with the rest of the app).
  const { user } = await getUserOrg();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await params;
  if (!isValidEntity(type)) {
    return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
  }

  const tpl = TEMPLATES[type];
  const csv =
    csvLine(tpl.headers) + '\n' + csvLine(tpl.sample) + '\n';

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}_template.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

function isValidEntity(t: string): t is ImportEntity {
  return t === 'properties' || t === 'units' || t === 'tenants' || t === 'leases';
}

function csvLine(values: string[]): string {
  return values
    .map((v) => {
      if (v.includes(',') || v.includes('"') || v.includes('\n')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    })
    .join(',');
}
