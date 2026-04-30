import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import {
  validatePropertyRow,
  validateUnitRow,
  validateTenantRow,
  validateLeaseRow,
  type ImportEntity,
} from '@/lib/import/csv-parser';

const VALID_ENTITIES: ImportEntity[] = ['properties', 'units', 'tenants', 'leases'];

/**
 * POST /api/import/preview
 * Body: { type: ImportEntity, rows: Record<string,string>[], mapping: Record<string,string> }
 *
 * The `mapping` translates a CSV column header -> the internal canonical field name
 * (matching what the validators expect). We apply that mapping here, run the
 * validator for each row, and return per-row errors.
 *
 * Does NOT write to the database.
 */
export async function POST(request: NextRequest) {
  const { user, orgId } = await getUserOrg();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 403 });

  let body: {
    type?: ImportEntity;
    rows?: Record<string, string>[];
    mapping?: Record<string, string>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, rows, mapping } = body;
  if (!type || !VALID_ENTITIES.includes(type)) {
    return NextResponse.json({ error: 'Invalid or missing `type`' }, { status: 400 });
  }
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: 'Missing `rows` array' }, { status: 400 });
  }
  if (!mapping || typeof mapping !== 'object') {
    return NextResponse.json({ error: 'Missing `mapping` object' }, { status: 400 });
  }

  const validators: Record<ImportEntity, (row: Record<string, string>) => string[]> = {
    properties: validatePropertyRow,
    units: validateUnitRow,
    tenants: validateTenantRow,
    leases: validateLeaseRow,
  };

  const errors: { row: number; field: string; message: string }[] = [];
  let validCount = 0;
  let invalidCount = 0;

  rows.forEach((rawRow, idx) => {
    const mapped = applyMapping(rawRow, mapping);
    const rowErrors = validators[type](mapped);

    // Soft-validate email/phone formats when present
    if (mapped.email && !isValidEmail(mapped.email)) {
      rowErrors.push('Invalid email format');
    }
    if (mapped.phone && !isValidPhone(mapped.phone)) {
      rowErrors.push('Invalid phone format');
    }

    if (rowErrors.length > 0) {
      invalidCount++;
      rowErrors.forEach((message) => {
        errors.push({ row: idx + 2, field: extractField(message), message });
      });
    } else {
      validCount++;
    }
  });

  return NextResponse.json({
    valid_count: validCount,
    invalid_count: invalidCount,
    total: rows.length,
    errors: errors.slice(0, 200), // cap response size
  });
}

function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [csvCol, targetCol] of Object.entries(mapping)) {
    if (!targetCol) continue;
    const v = row[csvCol];
    if (v !== undefined && v !== '') out[targetCol] = String(v).trim();
  }
  return out;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhone(s: string): boolean {
  // Strip everything but digits — accept 7..15 digits
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function extractField(message: string): string {
  // Heuristic: pull the field name out of "Missing X" / "Invalid X format"
  const m = message.match(/Missing\s+(.+)$/i) || message.match(/Invalid\s+(\w+)/i);
  return (m?.[1] || '').toLowerCase().replace(/\s+/g, '_');
}
