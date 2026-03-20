-- =============================================================
-- 023: Phase 4 — Enterprise (White-label, Multi-location, SSO)
-- =============================================================

-- ── 1. White-label branding per org ──
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#00D4AA',
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS email_from_name TEXT,
  ADD COLUMN IF NOT EXISTS email_from_address TEXT,
  ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sso_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sso_provider TEXT CHECK (sso_provider IN ('saml', 'oidc', 'google', 'microsoft')),
  ADD COLUMN IF NOT EXISTS sso_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_franchise BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_org_parent ON organizations(parent_org_id);

-- ── 2. Locations (for multi-location operators) ──
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  timezone TEXT DEFAULT 'America/Phoenix',
  manager_id UUID REFERENCES auth.users(id),
  properties_count INT DEFAULT 0,
  units_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_org ON locations(org_id);

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view locations" ON locations FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org admins manage locations" ON locations FOR ALL USING (
  org_id = auth_org_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND org_id = auth_org_id() AND role IN ('admin', 'owner'))
);
CREATE POLICY "Service role all locations" ON locations FOR ALL USING (auth.role() = 'service_role');

-- ── 3. Link properties to locations ──
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location_id);

-- ── 4. Audit log (for SOC 2 compliance) ──
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins view audit_log" ON audit_log FOR SELECT USING (
  org_id = auth_org_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND org_id = auth_org_id() AND role IN ('admin', 'owner'))
);
CREATE POLICY "Service role all audit_log" ON audit_log FOR ALL USING (auth.role() = 'service_role');

-- ── 5. SLA tracking ──
CREATE TABLE sla_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('response_time', 'uptime', 'resolution_time', 'triage_time')),
  period_date DATE NOT NULL,
  target_value NUMERIC(10,2),
  actual_value NUMERIC(10,2),
  met BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_org ON sla_metrics(org_id);
CREATE INDEX idx_sla_date ON sla_metrics(period_date);

ALTER TABLE sla_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view sla_metrics" ON sla_metrics FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Service role all sla_metrics" ON sla_metrics FOR ALL USING (auth.role() = 'service_role');
