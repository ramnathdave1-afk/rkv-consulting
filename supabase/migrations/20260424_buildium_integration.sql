-- =============================================================
-- 20260424: Buildium Integration
-- Adds external ID columns for Buildium sync.
--
-- Note: integration_configs and integration_sync_logs tables are
-- created by 20260424_appfolio_integration.sql. This migration only
-- adds the per-table buildium_* external ID columns + indexes. If
-- the AppFolio migration was rolled back / hasn't run, run it first.
-- =============================================================

-- ── Properties ──
ALTER TABLE properties ADD COLUMN IF NOT EXISTS buildium_property_id text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_buildium
  ON properties(org_id, buildium_property_id)
  WHERE buildium_property_id IS NOT NULL;

-- ── Units ──
ALTER TABLE units ADD COLUMN IF NOT EXISTS buildium_unit_id text;
ALTER TABLE units ADD COLUMN IF NOT EXISTS external_source text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_units_buildium
  ON units(org_id, buildium_unit_id)
  WHERE buildium_unit_id IS NOT NULL;

-- ── Tenants ──
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS buildium_tenant_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS external_source text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_buildium
  ON tenants(org_id, buildium_tenant_id)
  WHERE buildium_tenant_id IS NOT NULL;

-- ── Leases ──
ALTER TABLE leases ADD COLUMN IF NOT EXISTS buildium_lease_id text;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS external_source text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leases_buildium
  ON leases(org_id, buildium_lease_id)
  WHERE buildium_lease_id IS NOT NULL;

-- ── Work Orders ──
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS buildium_work_order_id text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS external_source text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_buildium
  ON work_orders(org_id, buildium_work_order_id)
  WHERE buildium_work_order_id IS NOT NULL;

-- ── Defensive: ensure integration_configs / integration_sync_logs exist ──
-- (No-op if AppFolio migration already ran. Mirror of that DDL with IF NOT EXISTS.)
CREATE TABLE IF NOT EXISTS integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  enabled boolean DEFAULT false,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_summary jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integration_configs_org ON integration_configs(org_id);

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  entity_type text NOT NULL,
  status text NOT NULL,
  imported int DEFAULT 0,
  updated int DEFAULT 0,
  skipped int DEFAULT 0,
  errors jsonb DEFAULT '[]',
  triggered_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_org_provider
  ON integration_sync_logs(org_id, provider, created_at DESC);
