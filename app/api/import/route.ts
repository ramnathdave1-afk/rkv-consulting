import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseCSV, mapCSVRow, validatePropertyRow, validateUnitRow, validateTenantRow, validateLeaseRow, type ImportEntity } from '@/lib/import/csv-parser';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const entity = formData.get('entity') as ImportEntity | null;

  if (!file || !entity) {
    return NextResponse.json({ error: 'Missing file or entity type' }, { status: 400 });
  }

  if (!['properties', 'units', 'tenants', 'leases'].includes(entity)) {
    return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
  }

  const text = await file.text();
  const rawRows = parseCSV(text);

  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
  }

  const orgId = profile.org_id;
  const results = { created: 0, skipped: 0, errors: [] as { row: number; messages: string[] }[] };

  const validators: Record<ImportEntity, (row: Record<string, string>) => string[]> = {
    properties: validatePropertyRow,
    units: validateUnitRow,
    tenants: validateTenantRow,
    leases: validateLeaseRow,
  };

  for (let i = 0; i < rawRows.length; i++) {
    const mapped = mapCSVRow(rawRows[i], entity);
    const errors = validators[entity](mapped);

    if (errors.length > 0) {
      results.errors.push({ row: i + 2, messages: errors });
      results.skipped++;
      continue;
    }

    try {
      if (entity === 'properties') {
        const propertyType = normalizePropertyType(mapped.property_type);
        const { error } = await supabase.from('properties').insert({
          org_id: orgId,
          name: mapped.name,
          address_line1: mapped.address_line1,
          address_line2: mapped.address_line2 || null,
          city: mapped.city,
          state: mapped.state,
          zip: mapped.zip,
          property_type: propertyType,
          unit_count: parseInt(mapped.unit_count) || 0,
          year_built: parseInt(mapped.year_built) || null,
          created_by: user.id,
        });
        if (error) throw error;

      } else if (entity === 'units') {
        // Look up property by name
        const { data: property } = await supabase.from('properties').select('id').eq('org_id', orgId).eq('name', mapped.property_name).single();
        if (!property) {
          results.errors.push({ row: i + 2, messages: [`Property "${mapped.property_name}" not found`] });
          results.skipped++;
          continue;
        }

        const { error } = await supabase.from('units').insert({
          org_id: orgId,
          property_id: property.id,
          unit_number: mapped.unit_number,
          bedrooms: parseInt(mapped.bedrooms) || 0,
          bathrooms: parseFloat(mapped.bathrooms) || 1,
          square_footage: parseInt(mapped.square_footage) || null,
          market_rent: parseFloat(mapped.market_rent) || null,
          status: normalizeUnitStatus(mapped.status),
          floor_plan: mapped.floor_plan || null,
        });
        if (error) throw error;

      } else if (entity === 'tenants') {
        let firstName = mapped.first_name || '';
        let lastName = mapped.last_name || '';
        if (!firstName && mapped.full_name) {
          const parts = mapped.full_name.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }

        const { error } = await supabase.from('tenants').insert({
          org_id: orgId,
          first_name: firstName,
          last_name: lastName,
          email: mapped.email || null,
          phone: mapped.phone || null,
          status: normalizeTenantStatus(mapped.status),
          move_in_date: mapped.move_in_date || null,
          move_out_date: mapped.move_out_date || null,
        });
        if (error) throw error;

      } else if (entity === 'leases') {
        // Look up tenant by name
        const tenantParts = (mapped.tenant_name || '').split(' ');
        const { data: tenant } = await supabase.from('tenants').select('id')
          .eq('org_id', orgId).eq('first_name', tenantParts[0] || '').eq('last_name', tenantParts.slice(1).join(' ') || '').single();

        // Look up unit by number + property name
        let unitId: string | null = null;
        if (mapped.unit_number) {
          const unitQuery = supabase.from('units').select('id').eq('org_id', orgId).eq('unit_number', mapped.unit_number);
          const { data: unit } = await unitQuery.limit(1).single();
          unitId = unit?.id || null;
        }

        if (!tenant) {
          results.errors.push({ row: i + 2, messages: [`Tenant "${mapped.tenant_name}" not found — import tenants first`] });
          results.skipped++;
          continue;
        }
        if (!unitId) {
          results.errors.push({ row: i + 2, messages: [`Unit "${mapped.unit_number}" not found — import units first`] });
          results.skipped++;
          continue;
        }

        const { error } = await supabase.from('leases').insert({
          org_id: orgId,
          unit_id: unitId,
          tenant_id: tenant.id,
          lease_start: mapped.lease_start,
          lease_end: mapped.lease_end,
          monthly_rent: parseFloat(mapped.monthly_rent) || 0,
          security_deposit: parseFloat(mapped.security_deposit) || null,
          status: normalizeLeaseStatus(mapped.status),
        });
        if (error) throw error;
      }

      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 2, messages: [String(err)] });
      results.skipped++;
    }
  }

  return NextResponse.json({
    entity,
    total_rows: rawRows.length,
    created: results.created,
    skipped: results.skipped,
    errors: results.errors.slice(0, 20), // Limit error output
  });
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
