import { NextRequest, NextResponse } from 'next/server';
import { getUserOrg } from '@/lib/auth/get-user-org';
import {
  validatePropertyRow,
  validateUnitRow,
  validateTenantRow,
  validateLeaseRow,
  type ImportEntity,
} from '@/lib/import/csv-parser';
import { requireFeature } from '@/lib/billing/gate';

const VALID_ENTITIES: ImportEntity[] = ['properties', 'units', 'tenants', 'leases'];

/**
 * POST /api/import/execute
 * Body: {
 *   type: ImportEntity,
 *   rows: Record<string,string>[],
 *   mapping: Record<string,string>,
 *   confirm: true,
 * }
 *
 * For each valid row, performs INSERT scoped to the authenticated user's org_id.
 * Uses Supabase batch insert per chunk for performance. Returns counts and
 * up to 50 row-level errors.
 */
export async function POST(request: NextRequest) {
  const { user, orgId, role, supabase } = await getUserOrg();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 403 });
  if (role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const gate = await requireFeature(orgId, 'csv_import');
  if (!gate.allowed) return gate.response;

  let body: {
    type?: ImportEntity;
    rows?: Record<string, string>[];
    mapping?: Record<string, string>;
    confirm?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, rows, mapping, confirm } = body;
  if (confirm !== true) {
    return NextResponse.json({ error: 'confirm must be true' }, { status: 400 });
  }
  if (!type || !VALID_ENTITIES.includes(type)) {
    return NextResponse.json({ error: 'Invalid or missing `type`' }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }
  if (!mapping) {
    return NextResponse.json({ error: 'Missing mapping' }, { status: 400 });
  }

  const validators: Record<ImportEntity, (row: Record<string, string>) => string[]> = {
    properties: validatePropertyRow,
    units: validateUnitRow,
    tenants: validateTenantRow,
    leases: validateLeaseRow,
  };

  const errors: { row: number; messages: string[] }[] = [];
  let imported = 0;
  let skipped = 0;

  // Build the insert payload per-row, tracking the original CSV row index for errors
  type Pending = { rowIdx: number; payload: Record<string, unknown> };
  const pending: Pending[] = [];

  // Pre-fetch lookups for unit/lease imports
  const propertyLookup = new Map<string, string>(); // name -> id
  const tenantLookup = new Map<string, string>(); // "first last" -> id
  const unitLookup = new Map<string, string>(); // unit_number -> id

  if (type === 'units' || type === 'leases') {
    const { data: props } = await supabase
      .from('properties')
      .select('id, name')
      .eq('org_id', orgId);
    (props || []).forEach((p) => propertyLookup.set(p.name, p.id));
  }
  if (type === 'leases') {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, first_name, last_name')
      .eq('org_id', orgId);
    (tenants || []).forEach((t) =>
      tenantLookup.set(`${t.first_name} ${t.last_name}`.trim(), t.id),
    );
    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('org_id', orgId);
    (units || []).forEach((u) => unitLookup.set(u.unit_number, u.id));
  }

  for (let i = 0; i < rows.length; i++) {
    const mapped = applyMapping(rows[i], mapping);
    const rowErrors = validators[type](mapped);
    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, messages: rowErrors });
      skipped++;
      continue;
    }

    try {
      if (type === 'properties') {
        pending.push({
          rowIdx: i + 2,
          payload: {
            org_id: orgId,
            name: mapped.name,
            address_line1: mapped.address_line1,
            address_line2: mapped.address_line2 || null,
            city: mapped.city,
            state: mapped.state,
            zip: mapped.zip,
            property_type: normalizePropertyType(mapped.property_type),
            unit_count: parseIntSafe(mapped.unit_count) ?? 0,
            year_built: parseIntSafe(mapped.year_built),
            created_by: user.id,
          },
        });
      } else if (type === 'units') {
        const propertyId = propertyLookup.get(mapped.property_name);
        if (!propertyId) {
          errors.push({
            row: i + 2,
            messages: [`Property "${mapped.property_name}" not found`],
          });
          skipped++;
          continue;
        }
        pending.push({
          rowIdx: i + 2,
          payload: {
            org_id: orgId,
            property_id: propertyId,
            unit_number: mapped.unit_number,
            bedrooms: parseIntSafe(mapped.bedrooms) ?? 0,
            bathrooms: parseFloatSafe(mapped.bathrooms) ?? 1,
            square_footage: parseIntSafe(mapped.square_footage),
            market_rent: parseFloatSafe(mapped.market_rent),
            status: normalizeUnitStatus(mapped.status),
            floor_plan: mapped.floor_plan || null,
          },
        });
      } else if (type === 'tenants') {
        let firstName = mapped.first_name || '';
        let lastName = mapped.last_name || '';
        if (!firstName && mapped.full_name) {
          const parts = mapped.full_name.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
        pending.push({
          rowIdx: i + 2,
          payload: {
            org_id: orgId,
            first_name: firstName,
            last_name: lastName,
            email: mapped.email || null,
            phone: mapped.phone || null,
            status: normalizeTenantStatus(mapped.status),
            move_in_date: mapped.move_in_date || null,
            move_out_date: mapped.move_out_date || null,
          },
        });
      } else if (type === 'leases') {
        const tenantId = tenantLookup.get((mapped.tenant_name || '').trim());
        const unitId = mapped.unit_number ? unitLookup.get(mapped.unit_number) : undefined;
        if (!tenantId) {
          errors.push({
            row: i + 2,
            messages: [`Tenant "${mapped.tenant_name}" not found — import tenants first`],
          });
          skipped++;
          continue;
        }
        if (!unitId) {
          errors.push({
            row: i + 2,
            messages: [`Unit "${mapped.unit_number}" not found — import units first`],
          });
          skipped++;
          continue;
        }
        pending.push({
          rowIdx: i + 2,
          payload: {
            org_id: orgId,
            unit_id: unitId,
            tenant_id: tenantId,
            lease_start: mapped.lease_start,
            lease_end: mapped.lease_end,
            monthly_rent: parseFloatSafe(mapped.monthly_rent) ?? 0,
            security_deposit: parseFloatSafe(mapped.security_deposit),
            status: normalizeLeaseStatus(mapped.status),
          },
        });
      }
    } catch (err) {
      errors.push({ row: i + 2, messages: [String(err)] });
      skipped++;
    }
  }

  // Batch insert in chunks of 200
  const tableMap: Record<ImportEntity, string> = {
    properties: 'properties',
    units: 'units',
    tenants: 'tenants',
    leases: 'leases',
  };
  const chunkSize = 200;
  for (let i = 0; i < pending.length; i += chunkSize) {
    const chunk = pending.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(tableMap[type])
      .insert(chunk.map((p) => p.payload));

    if (error) {
      // Fallback: insert individually so we can attribute errors per row
      for (const p of chunk) {
        const { error: rowErr } = await supabase
          .from(tableMap[type])
          .insert(p.payload);
        if (rowErr) {
          errors.push({ row: p.rowIdx, messages: [rowErr.message] });
          skipped++;
        } else {
          imported++;
        }
      }
    } else {
      imported += chunk.length;
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    total: rows.length,
    errors: errors.slice(0, 50),
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

function parseIntSafe(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function parseFloatSafe(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function normalizePropertyType(type?: string): string {
  if (!type) return 'multifamily';
  const t = type.toLowerCase().replace(/[-\s]/g, '_');
  const valid = ['multifamily', 'single_family', 'commercial', 'mixed_use', 'hoa'];
  return valid.includes(t) ? t : 'multifamily';
}
function normalizeUnitStatus(status?: string): string {
  if (!status) return 'vacant';
  const s = status.toLowerCase().replace(/[-\s]/g, '_');
  const valid = ['occupied', 'vacant', 'notice', 'make_ready', 'down', 'model'];
  return valid.includes(s) ? s : 'vacant';
}
function normalizeTenantStatus(status?: string): string {
  if (!status) return 'active';
  const s = status.toLowerCase();
  const valid = ['prospect', 'applicant', 'approved', 'active', 'notice', 'past', 'denied'];
  return valid.includes(s) ? s : 'active';
}
function normalizeLeaseStatus(status?: string): string {
  if (!status) return 'active';
  const s = status.toLowerCase();
  const valid = ['pending', 'active', 'expired', 'terminated', 'renewed'];
  return valid.includes(s) ? s : 'active';
}
