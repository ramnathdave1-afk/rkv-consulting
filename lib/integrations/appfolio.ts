/**
 * AppFolio Property Management Integration
 *
 * AppFolio does NOT publish a public OAuth API. Their "API" is partner-only and
 * gated behind a sales process. The realistic integration paths for SMB PMs are:
 *
 *   1. AppFolio Realtime CSV/Excel exports (manual upload OR scheduled SFTP)
 *   2. AppFolio Webhooks (limited event coverage)
 *
 * This module implements both. CSV parsing is hand-rolled (no dep) and handles
 * quoted fields, escaped quotes, and CRLF line endings — the formats AppFolio's
 * Reports → Export feature emits.
 *
 * Sync idempotency is achieved via per-entity `appfolio_*_id` columns on the
 * existing properties / units / tenants / leases / work_orders tables.
 *
 * Each sync writes a row to `integration_sync_logs` for observability.
 */

import { createClient } from '@/lib/supabase/server';
import { captureException } from '@/lib/monitoring/sentry';
import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export type SyncEntityType =
  | 'properties'
  | 'units'
  | 'tenants'
  | 'leases'
  | 'work_orders';

export interface AppFolioConfig {
  org_id: string;
  sftp_host?: string;
  sftp_user?: string;
  sftp_password_encrypted?: string; // base64 for now; rotate to KMS
  webhook_secret?: string;
  last_sync_at?: string;
  enabled: boolean;
}

export interface SyncRowError {
  row: number;
  message: string;
}

export interface SyncResult {
  entity: SyncEntityType;
  imported: number;
  updated: number;
  skipped: number;
  errors: SyncRowError[];
}

export type TriggerSource = 'manual' | 'scheduled' | 'webhook';

// ──────────────────────────────────────────────────────────────────────
// CSV Parser
// Real parser — handles quoted fields, escaped quotes (""), CRLF, and
// trailing whitespace. Returns array of row objects keyed by header.
// ──────────────────────────────────────────────────────────────────────

export function parseCsv(text: string): Record<string, string>[] {
  // Strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      cur.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // CRLF or lone CR — end of row
      if (text[i + 1] === '\n') i++;
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Flush last field/row if file doesn't end with newline
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip fully-empty rows
    if (row.length === 1 && row[0].trim() === '') continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (row[c] ?? '').trim();
    }
    out.push(obj);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/** Pull the first non-empty value from a list of candidate column names. */
function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v.trim() !== '') return v.trim();
  }
  return '';
}

function parseInt0(v: string): number {
  const n = parseInt(v.replace(/[, ]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseMoney(v: string): number | null {
  if (!v) return null;
  const cleaned = v.replace(/[$, ]/g, '').replace(/[()]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: string): string | null {
  if (!v) return null;
  // AppFolio commonly emits MM/DD/YYYY — also accept YYYY-MM-DD
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (iso.test(v)) return v;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const m = v.match(us);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    let yy = m[3];
    if (yy.length === 2) yy = (parseInt(yy, 10) > 50 ? '19' : '20') + yy;
    return `${yy}-${mm}-${dd}`;
  }
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function emptyResult(entity: SyncEntityType): SyncResult {
  return { entity, imported: 0, updated: 0, skipped: 0, errors: [] };
}

async function logSync(
  supabase: SupabaseClient,
  orgId: string,
  result: SyncResult,
  triggeredBy: TriggerSource,
): Promise<void> {
  const status =
    result.errors.length === 0
      ? 'success'
      : result.imported + result.updated > 0
        ? 'partial'
        : 'failed';
  try {
    await supabase.from('integration_sync_logs').insert({
      org_id: orgId,
      provider: 'appfolio',
      entity_type: result.entity,
      status,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
      triggered_by: triggeredBy,
    });
    await supabase
      .from('integration_configs')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_summary: {
          entity: result.entity,
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          error_count: result.errors.length,
        },
      })
      .eq('org_id', orgId)
      .eq('provider', 'appfolio');
  } catch (err) {
    captureException(err, { where: 'appfolio.logSync', orgId });
  }
}

// ──────────────────────────────────────────────────────────────────────
// Property sync
// Expected AppFolio columns (Properties report):
//   "Property ID", "Property Name", "Address 1", "Address 2",
//   "City", "State", "Zip", "Property Type", "Number of Units", "Year Built"
// ──────────────────────────────────────────────────────────────────────

export async function syncPropertiesFromCsv(
  orgId: string,
  csvText: string,
  triggeredBy: TriggerSource = 'manual',
): Promise<SyncResult> {
  const supabase = await createClient();
  const result = emptyResult('properties');
  const rows = parseCsv(csvText);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const appfolioId = pick(row, 'Property ID', 'PropertyId', 'ID');
      const name = pick(row, 'Property Name', 'Name');
      const address1 = pick(row, 'Address 1', 'Address Line 1', 'Property Address', 'Address');
      const city = pick(row, 'City');
      const state = pick(row, 'State');
      const zip = pick(row, 'Zip', 'Zip Code', 'Postal Code');

      if (!appfolioId || !name) {
        result.skipped++;
        result.errors.push({ row: i + 2, message: 'Missing Property ID or Name' });
        continue;
      }
      if (!address1 || !city || !state || !zip) {
        result.skipped++;
        result.errors.push({
          row: i + 2,
          message: 'Missing required address fields (address1/city/state/zip)',
        });
        continue;
      }

      const propertyTypeRaw = pick(row, 'Property Type', 'Type').toLowerCase();
      const property_type =
        propertyTypeRaw.includes('single') ? 'single_family'
        : propertyTypeRaw.includes('commercial') ? 'commercial'
        : propertyTypeRaw.includes('mixed') ? 'mixed_use'
        : propertyTypeRaw.includes('hoa') ? 'hoa'
        : 'multifamily';

      const payload = {
        org_id: orgId,
        appfolio_property_id: appfolioId,
        external_source: 'appfolio',
        external_id: appfolioId,
        last_synced_at: new Date().toISOString(),
        name,
        address_line1: address1,
        address_line2: pick(row, 'Address 2', 'Address Line 2') || null,
        city,
        state,
        zip,
        property_type,
        unit_count: parseInt0(pick(row, 'Number of Units', 'Unit Count', 'Units')),
        year_built: parseInt0(pick(row, 'Year Built')) || null,
      };

      // Idempotent upsert by (org_id, appfolio_property_id)
      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('org_id', orgId)
        .eq('appfolio_property_id', appfolioId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from('properties').insert(payload);
        if (error) throw error;
        result.imported++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, message });
      captureException(err, { where: 'syncPropertiesFromCsv', orgId, csvRow: i + 2 });
    }
  }

  await logSync(supabase, orgId, result, triggeredBy);
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Unit sync
// Expected columns: "Unit ID", "Property ID", "Unit", "Bedrooms",
//   "Bathrooms", "Sq Ft", "Market Rent", "Status"
// ──────────────────────────────────────────────────────────────────────

export async function syncUnitsFromCsv(
  orgId: string,
  csvText: string,
  triggeredBy: TriggerSource = 'manual',
): Promise<SyncResult> {
  const supabase = await createClient();
  const result = emptyResult('units');
  const rows = parseCsv(csvText);

  // Pre-resolve appfolio_property_id → properties.id
  const { data: props } = await supabase
    .from('properties')
    .select('id, appfolio_property_id')
    .eq('org_id', orgId)
    .not('appfolio_property_id', 'is', null);
  const propMap = new Map<string, string>();
  for (const p of props || []) {
    if (p.appfolio_property_id) propMap.set(String(p.appfolio_property_id), p.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const appfolioUnitId = pick(row, 'Unit ID', 'UnitId');
      const appfolioPropId = pick(row, 'Property ID', 'PropertyId');
      const unitNumber = pick(row, 'Unit', 'Unit Number', 'Unit Name');

      if (!appfolioUnitId || !unitNumber) {
        result.skipped++;
        result.errors.push({ row: i + 2, message: 'Missing Unit ID or Unit number' });
        continue;
      }
      const property_id = propMap.get(appfolioPropId);
      if (!property_id) {
        result.skipped++;
        result.errors.push({
          row: i + 2,
          message: `Property ID ${appfolioPropId} not found — sync properties first`,
        });
        continue;
      }

      const statusRaw = pick(row, 'Status', 'Unit Status').toLowerCase();
      const status =
        statusRaw.includes('occupied') ? 'occupied'
        : statusRaw.includes('notice') ? 'notice'
        : statusRaw.includes('ready') ? 'make_ready'
        : statusRaw.includes('down') ? 'down'
        : statusRaw.includes('model') ? 'model'
        : 'vacant';

      const payload = {
        org_id: orgId,
        property_id,
        appfolio_unit_id: appfolioUnitId,
        external_id: appfolioUnitId,
        external_source: 'appfolio',
        unit_number: unitNumber,
        floor_plan: pick(row, 'Floor Plan', 'Floorplan') || null,
        bedrooms: parseInt0(pick(row, 'Bedrooms', 'Beds')),
        bathrooms: parseFloat(pick(row, 'Bathrooms', 'Baths')) || 1,
        square_footage: parseInt0(pick(row, 'Sq Ft', 'Square Footage', 'SqFt')) || null,
        market_rent: parseMoney(pick(row, 'Market Rent', 'Asking Rent')),
        status,
      };

      const { data: existing } = await supabase
        .from('units')
        .select('id')
        .eq('org_id', orgId)
        .eq('appfolio_unit_id', appfolioUnitId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('units').update(payload).eq('id', existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from('units').insert(payload);
        if (error) throw error;
        result.imported++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, message });
      captureException(err, { where: 'syncUnitsFromCsv', orgId, csvRow: i + 2 });
    }
  }

  await logSync(supabase, orgId, result, triggeredBy);
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Tenant sync
// Expected columns: "Tenant ID", "First Name", "Last Name",
//   "Email", "Phone", "Status", "Move In", "Move Out"
// ──────────────────────────────────────────────────────────────────────

export async function syncTenantsFromCsv(
  orgId: string,
  csvText: string,
  triggeredBy: TriggerSource = 'manual',
): Promise<SyncResult> {
  const supabase = await createClient();
  const result = emptyResult('tenants');
  const rows = parseCsv(csvText);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const appfolioTenantId = pick(row, 'Tenant ID', 'TenantId', 'Resident ID');
      let first = pick(row, 'First Name', 'FirstName');
      let last = pick(row, 'Last Name', 'LastName');
      const fullName = pick(row, 'Tenant', 'Resident', 'Name');
      if ((!first || !last) && fullName) {
        const parts = fullName.split(/\s+/);
        first = first || parts[0] || '';
        last = last || parts.slice(1).join(' ') || '';
      }

      if (!appfolioTenantId) {
        result.skipped++;
        result.errors.push({ row: i + 2, message: 'Missing Tenant ID' });
        continue;
      }
      if (!first || !last) {
        result.skipped++;
        result.errors.push({ row: i + 2, message: 'Missing First/Last name' });
        continue;
      }

      const statusRaw = pick(row, 'Status', 'Tenant Status').toLowerCase();
      const status =
        statusRaw.includes('current') || statusRaw.includes('active') ? 'active'
        : statusRaw.includes('past') || statusRaw.includes('former') ? 'past'
        : statusRaw.includes('notice') ? 'notice'
        : statusRaw.includes('applic') ? 'applicant'
        : statusRaw.includes('approv') ? 'approved'
        : statusRaw.includes('den') ? 'denied'
        : 'prospect';

      const payload = {
        org_id: orgId,
        appfolio_tenant_id: appfolioTenantId,
        external_id: appfolioTenantId,
        external_source: 'appfolio',
        first_name: first,
        last_name: last,
        email: pick(row, 'Email', 'Email Address') || null,
        phone: pick(row, 'Phone', 'Phone Number', 'Mobile') || null,
        status,
        move_in_date: parseDate(pick(row, 'Move In', 'Move-In', 'Move In Date')),
        move_out_date: parseDate(pick(row, 'Move Out', 'Move-Out', 'Move Out Date')),
      };

      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('org_id', orgId)
        .eq('appfolio_tenant_id', appfolioTenantId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('tenants').update(payload).eq('id', existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from('tenants').insert(payload);
        if (error) throw error;
        result.imported++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, message });
      captureException(err, { where: 'syncTenantsFromCsv', orgId, csvRow: i + 2 });
    }
  }

  await logSync(supabase, orgId, result, triggeredBy);
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Lease sync
// Expected columns: "Lease ID", "Tenant ID", "Unit ID", "Lease From",
//   "Lease To", "Rent", "Deposit", "Status"
// ──────────────────────────────────────────────────────────────────────

export async function syncLeasesFromCsv(
  orgId: string,
  csvText: string,
  triggeredBy: TriggerSource = 'manual',
): Promise<SyncResult> {
  const supabase = await createClient();
  const result = emptyResult('leases');
  const rows = parseCsv(csvText);

  // Resolve tenant + unit lookups
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, appfolio_tenant_id')
    .eq('org_id', orgId)
    .not('appfolio_tenant_id', 'is', null);
  const tenantMap = new Map<string, string>();
  for (const t of tenants || [])
    if (t.appfolio_tenant_id) tenantMap.set(String(t.appfolio_tenant_id), t.id);

  const { data: units } = await supabase
    .from('units')
    .select('id, appfolio_unit_id')
    .eq('org_id', orgId)
    .not('appfolio_unit_id', 'is', null);
  const unitMap = new Map<string, string>();
  for (const u of units || [])
    if (u.appfolio_unit_id) unitMap.set(String(u.appfolio_unit_id), u.id);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const appfolioLeaseId = pick(row, 'Lease ID', 'LeaseId');
      const appfolioTenantId = pick(row, 'Tenant ID', 'TenantId', 'Resident ID');
      const appfolioUnitId = pick(row, 'Unit ID', 'UnitId');

      if (!appfolioLeaseId) {
        result.skipped++;
        result.errors.push({ row: i + 2, message: 'Missing Lease ID' });
        continue;
      }
      const tenant_id = tenantMap.get(appfolioTenantId);
      const unit_id = unitMap.get(appfolioUnitId);
      if (!tenant_id || !unit_id) {
        result.skipped++;
        result.errors.push({
          row: i + 2,
          message: `Tenant ${appfolioTenantId} or Unit ${appfolioUnitId} not found — sync those first`,
        });
        continue;
      }

      const lease_start = parseDate(pick(row, 'Lease From', 'Lease Start', 'Start Date'));
      const lease_end = parseDate(pick(row, 'Lease To', 'Lease End', 'End Date'));
      const monthly_rent = parseMoney(pick(row, 'Rent', 'Monthly Rent'));
      if (!lease_start || !lease_end || monthly_rent === null) {
        result.skipped++;
        result.errors.push({
          row: i + 2,
          message: 'Missing required lease fields (start/end/rent)',
        });
        continue;
      }

      const statusRaw = pick(row, 'Status', 'Lease Status').toLowerCase();
      const status =
        statusRaw.includes('active') || statusRaw.includes('current') ? 'active'
        : statusRaw.includes('expired') ? 'expired'
        : statusRaw.includes('terminated') ? 'terminated'
        : statusRaw.includes('renewed') ? 'renewed'
        : statusRaw.includes('pending') ? 'pending'
        : 'active';

      const payload = {
        org_id: orgId,
        appfolio_lease_id: appfolioLeaseId,
        external_id: appfolioLeaseId,
        external_source: 'appfolio',
        unit_id,
        tenant_id,
        lease_start,
        lease_end,
        monthly_rent,
        security_deposit: parseMoney(pick(row, 'Deposit', 'Security Deposit')),
        status,
      };

      const { data: existing } = await supabase
        .from('leases')
        .select('id')
        .eq('org_id', orgId)
        .eq('appfolio_lease_id', appfolioLeaseId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('leases').update(payload).eq('id', existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from('leases').insert(payload);
        if (error) throw error;
        result.imported++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, message });
      captureException(err, { where: 'syncLeasesFromCsv', orgId, csvRow: i + 2 });
    }
  }

  await logSync(supabase, orgId, result, triggeredBy);
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Work Order sync
// Expected columns: "Work Order ID", "Property ID", "Unit ID", "Title",
//   "Description", "Category", "Priority", "Status", "Created Date",
//   "Completed Date", "Cost"
// ──────────────────────────────────────────────────────────────────────

export async function syncWorkOrdersFromCsv(
  orgId: string,
  csvText: string,
  triggeredBy: TriggerSource = 'manual',
): Promise<SyncResult> {
  const supabase = await createClient();
  const result = emptyResult('work_orders');
  const rows = parseCsv(csvText);

  const { data: props } = await supabase
    .from('properties')
    .select('id, appfolio_property_id')
    .eq('org_id', orgId)
    .not('appfolio_property_id', 'is', null);
  const propMap = new Map<string, string>();
  for (const p of props || [])
    if (p.appfolio_property_id) propMap.set(String(p.appfolio_property_id), p.id);

  const { data: units } = await supabase
    .from('units')
    .select('id, appfolio_unit_id')
    .eq('org_id', orgId)
    .not('appfolio_unit_id', 'is', null);
  const unitMap = new Map<string, string>();
  for (const u of units || [])
    if (u.appfolio_unit_id) unitMap.set(String(u.appfolio_unit_id), u.id);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const appfolioWoId = pick(row, 'Work Order ID', 'WO ID', 'ID');
      const appfolioPropId = pick(row, 'Property ID', 'PropertyId');
      const appfolioUnitId = pick(row, 'Unit ID', 'UnitId');

      if (!appfolioWoId) {
        result.skipped++;
        result.errors.push({ row: i + 2, message: 'Missing Work Order ID' });
        continue;
      }
      const property_id = propMap.get(appfolioPropId);
      if (!property_id) {
        result.skipped++;
        result.errors.push({
          row: i + 2,
          message: `Property ID ${appfolioPropId} not found — sync properties first`,
        });
        continue;
      }
      const title = pick(row, 'Title', 'Subject', 'Issue') || 'Work Order';

      const categoryRaw = pick(row, 'Category', 'Type').toLowerCase();
      const category =
        categoryRaw.includes('plumb') ? 'plumbing'
        : categoryRaw.includes('elec') ? 'electrical'
        : categoryRaw.includes('hvac') || categoryRaw.includes('air') ? 'hvac'
        : categoryRaw.includes('appli') ? 'appliance'
        : categoryRaw.includes('pest') ? 'pest'
        : categoryRaw.includes('struct') ? 'structural'
        : categoryRaw.includes('cosmet') || categoryRaw.includes('paint') ? 'cosmetic'
        : categoryRaw.includes('safe') ? 'safety'
        : categoryRaw.includes('turn') ? 'turnover'
        : 'general';

      const priorityRaw = pick(row, 'Priority').toLowerCase();
      const priority =
        priorityRaw.includes('emerg') ? 'emergency'
        : priorityRaw.includes('high') ? 'high'
        : priorityRaw.includes('low') ? 'low'
        : 'medium';

      const statusRaw = pick(row, 'Status').toLowerCase();
      const status =
        statusRaw.includes('open') ? 'open'
        : statusRaw.includes('assigned') ? 'assigned'
        : statusRaw.includes('progress') ? 'in_progress'
        : statusRaw.includes('parts') ? 'parts_needed'
        : statusRaw.includes('complet') ? 'completed'
        : statusRaw.includes('closed') ? 'closed'
        : statusRaw.includes('cancel') ? 'cancelled'
        : 'open';

      const payload = {
        org_id: orgId,
        property_id,
        unit_id: unitMap.get(appfolioUnitId) || null,
        appfolio_work_order_id: appfolioWoId,
        external_id: appfolioWoId,
        external_source: 'appfolio',
        title,
        description: pick(row, 'Description', 'Notes') || null,
        category,
        priority,
        status,
        scheduled_date: parseDate(pick(row, 'Scheduled Date', 'Scheduled')),
        completed_date: parseDate(pick(row, 'Completed Date', 'Completed')),
        cost: parseMoney(pick(row, 'Cost', 'Total Cost')),
        source: 'manual',
      };

      const { data: existing } = await supabase
        .from('work_orders')
        .select('id')
        .eq('org_id', orgId)
        .eq('appfolio_work_order_id', appfolioWoId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('work_orders')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
        result.updated++;
      } else {
        const { error } = await supabase.from('work_orders').insert(payload);
        if (error) throw error;
        result.imported++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, message });
      captureException(err, { where: 'syncWorkOrdersFromCsv', orgId, csvRow: i + 2 });
    }
  }

  await logSync(supabase, orgId, result, triggeredBy);
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Dispatch by entity
// ──────────────────────────────────────────────────────────────────────

export async function syncFromCsv(
  orgId: string,
  entity: SyncEntityType,
  csvText: string,
  triggeredBy: TriggerSource = 'manual',
): Promise<SyncResult> {
  switch (entity) {
    case 'properties': return syncPropertiesFromCsv(orgId, csvText, triggeredBy);
    case 'units': return syncUnitsFromCsv(orgId, csvText, triggeredBy);
    case 'tenants': return syncTenantsFromCsv(orgId, csvText, triggeredBy);
    case 'leases': return syncLeasesFromCsv(orgId, csvText, triggeredBy);
    case 'work_orders': return syncWorkOrdersFromCsv(orgId, csvText, triggeredBy);
    default: {
      const _exhaustive: never = entity;
      throw new Error(`Unknown entity: ${_exhaustive}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Webhook signature verification
// AppFolio webhook payloads are signed via HMAC-SHA256 with a shared secret.
// ──────────────────────────────────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
  // Support `sha256=<hex>` or raw hex
  const provided = signatureHeader.replace(/^sha256=/, '').trim();
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ──────────────────────────────────────────────────────────────────────
// Config helpers (light wrapper — credentials are base64 placeholder; rotate to KMS)
// ──────────────────────────────────────────────────────────────────────

export function encodeSecret(plaintext: string): string {
  return Buffer.from(plaintext, 'utf8').toString('base64');
}

export function decodeSecret(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}
