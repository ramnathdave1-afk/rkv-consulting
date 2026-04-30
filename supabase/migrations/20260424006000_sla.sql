-- SLA tracking + comprehensive audit log
-- Adds SLA policies, SLA event tracking, and an enhanced audit_logs table

-- =============================================================================
-- SLA policies (org-defined targets)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  resource_type text NOT NULL, -- 'work_order', 'tenant_message', 'maintenance_request', 'lease_inquiry'
  priority text, -- 'emergency', 'high', 'standard', 'low' — applies when this matches; null = catch-all

  -- SLA targets (in minutes)
  acknowledge_within_min int,
  first_response_within_min int,
  resolve_within_min int,

  business_hours_only boolean DEFAULT false,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_policies_org ON sla_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_sla_policies_resource ON sla_policies(org_id, resource_type, enabled);

-- =============================================================================
-- SLA events (per-resource tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  policy_id uuid REFERENCES sla_policies(id) ON DELETE SET NULL,
  priority text,

  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,

  acknowledge_breached boolean DEFAULT false,
  first_response_breached boolean DEFAULT false,
  resolve_breached boolean DEFAULT false,

  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_events_org ON sla_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_events_resource ON sla_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_sla_events_breached ON sla_events(org_id) WHERE
  acknowledge_breached = true OR first_response_breached = true OR resolve_breached = true;
CREATE INDEX IF NOT EXISTS idx_sla_events_open ON sla_events(org_id, resource_type) WHERE resolved_at IS NULL;

-- =============================================================================
-- Comprehensive audit log
-- New table; the older `audit_log` table from migration 009 stays untouched.
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  changes jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(org_id, action, created_at DESC);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Read scoped to org members; writes are admin-only via service role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sla_policies_org_read') THEN
    CREATE POLICY sla_policies_org_read ON sla_policies FOR SELECT
      USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sla_events_org_read') THEN
    CREATE POLICY sla_events_org_read ON sla_events FOR SELECT
      USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_org_read') THEN
    CREATE POLICY audit_logs_org_read ON audit_logs FOR SELECT
      USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
END
$$;
