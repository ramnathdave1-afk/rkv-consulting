/**
 * CSV Import Parser
 * Parses CSV files for bulk import of properties, units, tenants, leases.
 * Handles common column name variations from AppFolio, Buildium, and manual exports.
 */

export interface CSVParseResult<T> {
  rows: T[];
  errors: { row: number; field: string; message: string }[];
  skipped: number;
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (values[j] || '').trim(); });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Column name mapping — handles variations from different PM platforms
const PROPERTY_COLUMN_MAP: Record<string, string> = {
  name: 'name', property_name: 'name', building_name: 'name', property: 'name',
  address: 'address_line1', address_line1: 'address_line1', street: 'address_line1', street_address: 'address_line1',
  address_2: 'address_line2', address_line2: 'address_line2', apt: 'address_line2', suite: 'address_line2',
  city: 'city', town: 'city',
  state: 'state', st: 'state',
  zip: 'zip', zip_code: 'zip', zipcode: 'zip', postal_code: 'zip',
  type: 'property_type', property_type: 'property_type',
  units: 'unit_count', unit_count: 'unit_count', total_units: 'unit_count', num_units: 'unit_count',
  year_built: 'year_built', built: 'year_built',
};

const UNIT_COLUMN_MAP: Record<string, string> = {
  unit: 'unit_number', unit_number: 'unit_number', unit_num: 'unit_number', unit_id: 'unit_number', unit_name: 'unit_number',
  property: 'property_name', property_name: 'property_name', building: 'property_name',
  bedrooms: 'bedrooms', beds: 'bedrooms', bed: 'bedrooms', br: 'bedrooms',
  bathrooms: 'bathrooms', baths: 'bathrooms', bath: 'bathrooms', ba: 'bathrooms',
  sqft: 'square_footage', square_footage: 'square_footage', sq_ft: 'square_footage', size: 'square_footage',
  rent: 'market_rent', market_rent: 'market_rent', monthly_rent: 'market_rent', asking_rent: 'market_rent',
  status: 'status', unit_status: 'status',
  floor_plan: 'floor_plan', plan: 'floor_plan', layout: 'floor_plan',
};

const TENANT_COLUMN_MAP: Record<string, string> = {
  first_name: 'first_name', firstname: 'first_name', first: 'first_name',
  last_name: 'last_name', lastname: 'last_name', last: 'last_name',
  name: 'full_name', tenant_name: 'full_name', resident_name: 'full_name', full_name: 'full_name',
  email: 'email', email_address: 'email', tenant_email: 'email',
  phone: 'phone', phone_number: 'phone', cell: 'phone', mobile: 'phone', tenant_phone: 'phone',
  status: 'status', tenant_status: 'status',
  move_in: 'move_in_date', move_in_date: 'move_in_date', movein: 'move_in_date',
  move_out: 'move_out_date', move_out_date: 'move_out_date', moveout: 'move_out_date',
};

const LEASE_COLUMN_MAP: Record<string, string> = {
  tenant: 'tenant_name', tenant_name: 'tenant_name', resident: 'tenant_name',
  unit: 'unit_number', unit_number: 'unit_number',
  property: 'property_name', property_name: 'property_name',
  start: 'lease_start', lease_start: 'lease_start', start_date: 'lease_start',
  end: 'lease_end', lease_end: 'lease_end', end_date: 'lease_end', expiration: 'lease_end',
  rent: 'monthly_rent', monthly_rent: 'monthly_rent', amount: 'monthly_rent',
  deposit: 'security_deposit', security_deposit: 'security_deposit',
  status: 'status', lease_status: 'status',
};

function mapColumns(row: Record<string, string>, columnMap: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [csvCol, value] of Object.entries(row)) {
    const targetCol = columnMap[csvCol];
    if (targetCol && value) {
      mapped[targetCol] = value;
    }
  }
  return mapped;
}

export type ImportEntity = 'properties' | 'units' | 'tenants' | 'leases';

export function mapCSVRow(row: Record<string, string>, entity: ImportEntity): Record<string, string> {
  const maps: Record<ImportEntity, Record<string, string>> = {
    properties: PROPERTY_COLUMN_MAP,
    units: UNIT_COLUMN_MAP,
    tenants: TENANT_COLUMN_MAP,
    leases: LEASE_COLUMN_MAP,
  };
  return mapColumns(row, maps[entity]);
}

export function validatePropertyRow(row: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!row.name) errors.push('Missing property name');
  if (!row.address_line1) errors.push('Missing address');
  if (!row.city) errors.push('Missing city');
  if (!row.state) errors.push('Missing state');
  if (!row.zip) errors.push('Missing zip code');
  return errors;
}

export function validateUnitRow(row: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!row.unit_number) errors.push('Missing unit number');
  if (!row.property_name) errors.push('Missing property name');
  return errors;
}

export function validateTenantRow(row: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!row.first_name && !row.full_name) errors.push('Missing tenant name');
  return errors;
}

export function validateLeaseRow(row: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!row.tenant_name) errors.push('Missing tenant name');
  if (!row.unit_number) errors.push('Missing unit number');
  if (!row.lease_start) errors.push('Missing lease start date');
  if (!row.lease_end) errors.push('Missing lease end date');
  if (!row.monthly_rent) errors.push('Missing monthly rent');
  return errors;
}
