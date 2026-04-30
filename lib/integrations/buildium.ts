/**
 * Buildium REST API client.
 *
 * Docs:    https://developer.buildium.com/
 * Auth:    Two headers — `x-buildium-client-id` + `x-buildium-client-secret`
 * Rate:    ~120 req/min per Buildium account. We add light client-side throttling
 *          (~500ms between requests during a sync) to stay well under the cap.
 * Paging:  `limit` (max 1000) + `offset` query params.
 *
 * This module is server-only (uses fetch + sentry). It is called from the
 * /api/integrations/buildium/* route handlers, never from the browser.
 */

import { captureException } from '@/lib/monitoring/sentry';
import type { createAdminClient } from '@/lib/supabase/admin';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const BUILDIUM_API_BASE = 'https://api.buildium.com/v1';
const PAGE_LIMIT = 100;
const REQUEST_DELAY_MS = 500; // ~120 req/min ceiling -> 500ms gap is comfy

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildiumCredentials {
  client_id: string;
  client_secret: string;
}

interface BuildiumAddress {
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
}

export interface BuildiumProperty {
  Id: number;
  Name: string;
  Address: BuildiumAddress;
  RentalSubType?: string;
  YearBuilt?: number;
  NumberUnits?: number;
}

export interface BuildiumUnit {
  Id: number;
  PropertyId: number;
  UnitNumber?: string;
  UnitBedrooms?: string | number;
  UnitBathrooms?: string | number;
  UnitSize?: number;
  Address?: BuildiumAddress;
  MarketRent?: number;
}

export interface BuildiumTenant {
  Id: number;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  PhoneNumbers?: { Number: string; Type: string }[];
  PrimaryAddress?: BuildiumAddress;
}

export interface BuildiumLease {
  Id: number;
  PropertyId: number;
  UnitId?: number;
  LeaseFromDate?: string;
  LeaseToDate?: string;
  LeaseStatus?: string;
  LeaseType?: string;
  Tenants?: { Id: number }[];
  Rent?: { Amount?: number };
}

export interface BuildiumWorkOrder {
  Id: number;
  PropertyId?: number;
  UnitId?: number;
  Title?: string;
  Description?: string;
  Status?: string;
  Priority?: string;
  WorkOrderDate?: string;
  DueDate?: string;
}

export interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// ─────────────────────────────────────────────────────────────────────────────
// Low-level fetch
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function buildiumFetch<T>(
  credentials: BuildiumCredentials,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BUILDIUM_API_BASE}${path}`, {
    ...options,
    headers: {
      'x-buildium-client-id': credentials.client_id,
      'x-buildium-client-secret': credentials.client_secret,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Buildium API ${response.status} ${path}: ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

/**
 * Generic paginated GET. Buildium returns arrays at the top level for list
 * endpoints. We fetch pages until we get a short page or hit a hard cap to
 * protect runaway syncs (~50k records max per entity per run).
 */
async function* paginate<T>(
  credentials: BuildiumCredentials,
  basePath: string,
): AsyncGenerator<T[]> {
  const HARD_CAP_PAGES = 500;
  let offset = 0;

  for (let page = 0; page < HARD_CAP_PAGES; page++) {
    const sep = basePath.includes('?') ? '&' : '?';
    const path = `${basePath}${sep}limit=${PAGE_LIMIT}&offset=${offset}`;
    const batch = await buildiumFetch<T[]>(credentials, path);
    if (!Array.isArray(batch) || batch.length === 0) return;
    yield batch;
    if (batch.length < PAGE_LIMIT) return;
    offset += PAGE_LIMIT;
    await sleep(REQUEST_DELAY_MS);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Quick auth check — Buildium /administration/account returns the connected account. */
export async function testConnection(credentials: BuildiumCredentials): Promise<boolean> {
  try {
    await buildiumFetch(credentials, '/administration/account');
    return true;
  } catch (err) {
    captureException(err, { context: 'buildium_test_connection' });
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map Buildium RentalSubType to our `properties.property_type` CHECK constraint:
 *   ('multifamily', 'single_family', 'commercial', 'mixed_use', 'hoa')
 */
export function mapPropertyType(buildiumType: string | undefined): string {
  const map: Record<string, string> = {
    CondoTownhome: 'multifamily',
    MultiFamily: 'multifamily',
    SingleFamily: 'single_family',
    Apartment: 'multifamily',
    CommercialMixedUse: 'mixed_use',
    Industrial: 'commercial',
    Office: 'commercial',
    Retail: 'commercial',
    Association: 'hoa',
    HomeownersAssociation: 'hoa',
  };
  if (!buildiumType) return 'multifamily';
  return map[buildiumType] ?? 'multifamily';
}

/**
 * `work_orders.status` CHECK:
 *   ('open','assigned','in_progress','parts_needed','completed','closed','cancelled')
 */
function mapWorkOrderStatus(s: string | undefined): string {
  if (!s) return 'open';
  const v = s.toLowerCase();
  if (v.includes('complete')) return 'completed';
  if (v === 'closed') return 'closed';
  if (v.includes('progress')) return 'in_progress';
  if (v.includes('cancel')) return 'cancelled';
  if (v.includes('assign')) return 'assigned';
  return 'open';
}

/**
 * `work_orders.priority` CHECK: ('emergency','high','medium','low')
 */
function mapWorkOrderPriority(s: string | undefined): string {
  if (!s) return 'medium';
  const v = s.toLowerCase();
  if (v.includes('emergency') || v.includes('urgent')) return 'emergency';
  if (v.includes('high')) return 'high';
  if (v.includes('low')) return 'low';
  return 'medium';
}

/**
 * `leases.status` CHECK: ('pending','active','expired','terminated','renewed')
 */
function mapLeaseStatus(s: string | undefined): string {
  if (!s) return 'active';
  const v = s.toLowerCase();
  if (v === 'past' || v === 'expired') return 'expired';
  if (v === 'future' || v === 'pending') return 'pending';
  if (v.includes('terminat')) return 'terminated';
  if (v.includes('renew')) return 'renewed';
  return 'active';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync: Properties (calls Buildium /rentals)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncProperties(
  orgId: string,
  credentials: BuildiumCredentials,
  supabaseAdmin: SupabaseAdmin,
): Promise<SyncResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    for await (const batch of paginate<BuildiumProperty>(credentials, '/rentals')) {
      for (const prop of batch) {
        try {
          // properties.address_line1, city, state, zip are NOT NULL — fall back to placeholders.
          const { error } = await supabaseAdmin.from('properties').upsert(
            {
              org_id: orgId,
              buildium_property_id: String(prop.Id),
              external_id: String(prop.Id),
              external_source: 'buildium',
              last_synced_at: new Date().toISOString(),
              name: prop.Name || `Buildium property ${prop.Id}`,
              address_line1: prop.Address?.AddressLine1 || 'Unknown',
              city: prop.Address?.City || 'Unknown',
              state: prop.Address?.State || 'XX',
              zip: prop.Address?.PostalCode || '00000',
              property_type: mapPropertyType(prop.RentalSubType),
              year_built: prop.YearBuilt ?? null,
              unit_count: prop.NumberUnits ?? 0,
            },
            { onConflict: 'org_id,buildium_property_id' },
          );
          if (error) errors.push(`Property ${prop.Id}: ${error.message}`);
          else imported++;
        } catch (err) {
          captureException(err, { context: 'buildium_property_sync', propertyId: prop.Id });
          errors.push(
            `Property ${prop.Id}: ${err instanceof Error ? err.message : 'unknown error'}`,
          );
        }
      }
    }
  } catch (err) {
    captureException(err, { context: 'buildium_property_pagination' });
    errors.push(`Property pagination: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return { imported, updated: 0, skipped: 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync: Units (calls Buildium /rentals/units)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncUnits(
  orgId: string,
  credentials: BuildiumCredentials,
  supabaseAdmin: SupabaseAdmin,
): Promise<SyncResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  // Build a map of buildium_property_id -> internal property uuid so we can
  // foreign-key correctly.
  const propIdMap = new Map<string, string>();
  const { data: props } = await supabaseAdmin
    .from('properties')
    .select('id, buildium_property_id')
    .eq('org_id', orgId)
    .not('buildium_property_id', 'is', null);
  for (const p of props ?? []) propIdMap.set(p.buildium_property_id as string, p.id as string);

  try {
    for await (const batch of paginate<BuildiumUnit>(credentials, '/rentals/units')) {
      for (const unit of batch) {
        try {
          const propertyUuid = propIdMap.get(String(unit.PropertyId));
          if (!propertyUuid) {
            skipped++;
            continue; // property hasn't been imported yet
          }
          const beds = typeof unit.UnitBedrooms === 'string'
            ? parseInt(unit.UnitBedrooms, 10) || null
            : unit.UnitBedrooms ?? null;
          const baths = typeof unit.UnitBathrooms === 'string'
            ? parseFloat(unit.UnitBathrooms) || null
            : unit.UnitBathrooms ?? null;

          const { error } = await supabaseAdmin.from('units').upsert(
            {
              org_id: orgId,
              property_id: propertyUuid,
              buildium_unit_id: String(unit.Id),
              external_id: String(unit.Id),
              external_source: 'buildium',
              unit_number: unit.UnitNumber || `BLDM-${unit.Id}`,
              bedrooms: beds ?? 0,
              bathrooms: baths ?? 1,
              square_footage: unit.UnitSize ?? null,
              market_rent: unit.MarketRent ?? null,
            },
            { onConflict: 'org_id,buildium_unit_id' },
          );
          if (error) errors.push(`Unit ${unit.Id}: ${error.message}`);
          else imported++;
        } catch (err) {
          captureException(err, { context: 'buildium_unit_sync', unitId: unit.Id });
          errors.push(`Unit ${unit.Id}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }
  } catch (err) {
    captureException(err, { context: 'buildium_unit_pagination' });
    errors.push(`Unit pagination: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return { imported, updated: 0, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync: Tenants (calls Buildium /leases/tenants)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncTenants(
  orgId: string,
  credentials: BuildiumCredentials,
  supabaseAdmin: SupabaseAdmin,
): Promise<SyncResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    for await (const batch of paginate<BuildiumTenant>(credentials, '/leases/tenants')) {
      for (const tenant of batch) {
        try {
          const phone = tenant.PhoneNumbers?.[0]?.Number ?? null;

          const { error } = await supabaseAdmin.from('tenants').upsert(
            {
              org_id: orgId,
              buildium_tenant_id: String(tenant.Id),
              external_id: String(tenant.Id),
              external_source: 'buildium',
              first_name: tenant.FirstName || 'Unknown',
              last_name: tenant.LastName || `Buildium-${tenant.Id}`,
              email: tenant.Email ?? null,
              phone,
            },
            { onConflict: 'org_id,buildium_tenant_id' },
          );
          if (error) errors.push(`Tenant ${tenant.Id}: ${error.message}`);
          else imported++;
        } catch (err) {
          captureException(err, { context: 'buildium_tenant_sync', tenantId: tenant.Id });
          errors.push(`Tenant ${tenant.Id}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }
  } catch (err) {
    captureException(err, { context: 'buildium_tenant_pagination' });
    errors.push(`Tenant pagination: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return { imported, updated: 0, skipped: 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync: Leases (calls Buildium /leases)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncLeases(
  orgId: string,
  credentials: BuildiumCredentials,
  supabaseAdmin: SupabaseAdmin,
): Promise<SyncResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  // Resolve buildium ids -> internal uuids. Leases require unit_id + tenant_id (NOT NULL).
  const unitIdMap = new Map<string, string>();
  const tenantIdMap = new Map<string, string>();
  const { data: units } = await supabaseAdmin
    .from('units')
    .select('id, buildium_unit_id')
    .eq('org_id', orgId)
    .not('buildium_unit_id', 'is', null);
  for (const u of units ?? []) unitIdMap.set(u.buildium_unit_id as string, u.id as string);
  const { data: tenantsRows } = await supabaseAdmin
    .from('tenants')
    .select('id, buildium_tenant_id')
    .eq('org_id', orgId)
    .not('buildium_tenant_id', 'is', null);
  for (const t of tenantsRows ?? [])
    tenantIdMap.set(t.buildium_tenant_id as string, t.id as string);

  try {
    for await (const batch of paginate<BuildiumLease>(credentials, '/leases')) {
      for (const lease of batch) {
        try {
          const unitUuid = lease.UnitId ? unitIdMap.get(String(lease.UnitId)) ?? null : null;
          if (!unitUuid) {
            // leases.unit_id is NOT NULL — skip if we can't resolve the unit
            skipped++;
            continue;
          }
          const primaryBuildiumTenantId = lease.Tenants?.[0]?.Id;
          const tenantUuid = primaryBuildiumTenantId
            ? tenantIdMap.get(String(primaryBuildiumTenantId)) ?? null
            : null;
          if (!tenantUuid) {
            // leases.tenant_id is NOT NULL — skip if we can't resolve a tenant
            skipped++;
            continue;
          }

          const { error } = await supabaseAdmin.from('leases').upsert(
            {
              org_id: orgId,
              buildium_lease_id: String(lease.Id),
              external_id: String(lease.Id),
              external_source: 'buildium',
              unit_id: unitUuid,
              tenant_id: tenantUuid,
              lease_start: lease.LeaseFromDate ?? null,
              lease_end: lease.LeaseToDate ?? null,
              status: mapLeaseStatus(lease.LeaseStatus),
              monthly_rent: lease.Rent?.Amount ?? 0,
            },
            { onConflict: 'org_id,buildium_lease_id' },
          );
          if (error) errors.push(`Lease ${lease.Id}: ${error.message}`);
          else imported++;
        } catch (err) {
          captureException(err, { context: 'buildium_lease_sync', leaseId: lease.Id });
          errors.push(`Lease ${lease.Id}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }
  } catch (err) {
    captureException(err, { context: 'buildium_lease_pagination' });
    errors.push(`Lease pagination: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return { imported, updated: 0, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync: Work Orders (calls Buildium /workorders)
// ─────────────────────────────────────────────────────────────────────────────

export async function syncWorkOrders(
  orgId: string,
  credentials: BuildiumCredentials,
  supabaseAdmin: SupabaseAdmin,
): Promise<SyncResult> {
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  const propIdMap = new Map<string, string>();
  const unitIdMap = new Map<string, string>();
  const { data: props } = await supabaseAdmin
    .from('properties')
    .select('id, buildium_property_id')
    .eq('org_id', orgId)
    .not('buildium_property_id', 'is', null);
  for (const p of props ?? []) propIdMap.set(p.buildium_property_id as string, p.id as string);
  const { data: units } = await supabaseAdmin
    .from('units')
    .select('id, buildium_unit_id')
    .eq('org_id', orgId)
    .not('buildium_unit_id', 'is', null);
  for (const u of units ?? []) unitIdMap.set(u.buildium_unit_id as string, u.id as string);

  try {
    for await (const batch of paginate<BuildiumWorkOrder>(credentials, '/workorders')) {
      for (const wo of batch) {
        try {
          const propertyUuid = wo.PropertyId ? propIdMap.get(String(wo.PropertyId)) ?? null : null;
          const unitUuid = wo.UnitId ? unitIdMap.get(String(wo.UnitId)) ?? null : null;
          if (!propertyUuid) {
            skipped++;
            continue;
          }

          const { error } = await supabaseAdmin.from('work_orders').upsert(
            {
              org_id: orgId,
              buildium_work_order_id: String(wo.Id),
              external_id: String(wo.Id),
              external_source: 'buildium',
              property_id: propertyUuid,
              unit_id: unitUuid,
              title: wo.Title || `Buildium work order ${wo.Id}`,
              description: wo.Description ?? null,
              status: mapWorkOrderStatus(wo.Status),
              priority: mapWorkOrderPriority(wo.Priority),
              metadata: {
                buildium_work_order_date: wo.WorkOrderDate ?? null,
                buildium_due_date: wo.DueDate ?? null,
                buildium_raw_status: wo.Status ?? null,
              },
            },
            { onConflict: 'org_id,buildium_work_order_id' },
          );
          if (error) errors.push(`WorkOrder ${wo.Id}: ${error.message}`);
          else imported++;
        } catch (err) {
          captureException(err, { context: 'buildium_workorder_sync', workOrderId: wo.Id });
          errors.push(`WorkOrder ${wo.Id}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }
  } catch (err) {
    captureException(err, { context: 'buildium_workorder_pagination' });
    errors.push(`WorkOrder pagination: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return { imported, updated: 0, skipped, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export type BuildiumEntity = 'properties' | 'units' | 'tenants' | 'leases' | 'work_orders';

export const ALL_ENTITIES: BuildiumEntity[] = [
  'properties',
  'units',
  'tenants',
  'leases',
  'work_orders',
];

export async function runSync(
  orgId: string,
  credentials: BuildiumCredentials,
  supabaseAdmin: SupabaseAdmin,
  entities: BuildiumEntity[] = ALL_ENTITIES,
): Promise<Record<BuildiumEntity, SyncResult | null>> {
  const out: Record<string, SyncResult | null> = {
    properties: null,
    units: null,
    tenants: null,
    leases: null,
    work_orders: null,
  };

  // Order matters: properties before units before leases/work_orders.
  const ordered = ALL_ENTITIES.filter((e) => entities.includes(e));

  for (const entity of ordered) {
    if (entity === 'properties') out.properties = await syncProperties(orgId, credentials, supabaseAdmin);
    if (entity === 'units') out.units = await syncUnits(orgId, credentials, supabaseAdmin);
    if (entity === 'tenants') out.tenants = await syncTenants(orgId, credentials, supabaseAdmin);
    if (entity === 'leases') out.leases = await syncLeases(orgId, credentials, supabaseAdmin);
    if (entity === 'work_orders') out.work_orders = await syncWorkOrders(orgId, credentials, supabaseAdmin);
  }

  return out as Record<BuildiumEntity, SyncResult | null>;
}
