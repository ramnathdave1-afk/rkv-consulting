-- =============================================================
-- 20260424: AppFolio Integration
-- Adds external ID columns + integration_configs + sync_logs tables
-- AppFolio doesn't have a public OAuth API — we sync via CSV/SFTP
-- =============================================================

-- ── Properties ──
ALTER TABLE properties ADD COLUMN IF NOT EXISTS appfolio_property_id text;
-- properties already has external_source column from migration 020 (with CHECK constraint)
-- so we don't re-add it. The constraint already includes 'appfolio'.

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_appfolio
  ON properties(org_id, appfolio_property_id)
  WHERE appfolio_property_id IS NOT NULL;

-- ── Units ──
ALTER TABLE units ADD COLUMN IF NOT EXISTS appfolio_unit_id text;
ALTER TABLE units ADD COLUMN IF NOT EXISTS external_source text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_units_appfolio
  ON units(org_id, appfolio_unit_id)
  WHERE appfolio_unit_id IS NOT NULL;

-- ── Tenants ──
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS appfolio_tenant_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS external_source text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_appfolio
  ON tenants(org_id, appfolio_tenant_id)
  WHERE appfolio_tenant_id IS NOT NULL;

-- ── Leases ──
ALTER TABLE leases ADD COLUMN IF NOT EXISTS appfolio_lease_id text;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS external_source text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leases_appfolio
  ON leases(org_id, appfolio_lease_id)
  WHERE appfolio_lease_id IS NOT NULL;

-- ── Work Orders ──
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS appfolio_work_order_id text;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS external_source text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_appfolio
  ON work_orders(org_id, appfolio_work_order_id)
  WHERE appfolio_work_order_id IS NOT NULL;

-- ── Integration Configs ──
-- Stores per-org per-provider config (SFTP credentials, webhook secret, etc.)
CREATE TABLE IF NOT EXISTS integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'appfolio', 'buildium', etc.
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

-- ── Integration Sync Logs ──
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  entity_type text NOT NULL,
  status text NOT NULL, -- 'success', 'partial', 'failed'
  imported int DEFAULT 0,
  updated int DEFAULT 0,
  skipped int DEFAULT 0,
  errors jsonb DEFAULT '[]',
  triggered_by text, -- 'manual', 'scheduled', 'webhook'
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_org_provider
  ON integration_sync_logs(org_id, provider, created_at DESC);

-- ── Updated-at trigger for integration_configs ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'integration_configs_updated_at'
  ) THEN
    CREATE TRIGGER integration_configs_updated_at
      BEFORE UPDATE ON integration_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ── RLS ──
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Org members view integration_configs'
  ) THEN
    CREATE POLICY "Org members view integration_configs" ON integration_configs
      FOR SELECT USING (org_id = auth_org_id());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Org admins write integration_configs'
  ) THEN
    CREATE POLICY "Org admins write integration_configs" ON integration_configs
      FOR ALL USING (
        org_id = auth_org_id()
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE user_id = auth.uid()
            AND org_id = auth_org_id()
            AND role IN ('admin', 'owner')
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role all integration_configs'
  ) THEN
    CREATE POLICY "Service role all integration_configs" ON integration_configs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Org members view integration_sync_logs'
  ) THEN
    CREATE POLICY "Org members view integration_sync_logs" ON integration_sync_logs
      FOR SELECT USING (org_id = auth_org_id());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role all integration_sync_logs'
  ) THEN
    CREATE POLICY "Service role all integration_sync_logs" ON integration_sync_logs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
