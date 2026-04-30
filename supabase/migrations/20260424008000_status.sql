-- Status page: incidents + uptime history
-- Public-readable; admin-managed

CREATE TABLE IF NOT EXISTS status_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'investigating', -- 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity text NOT NULL DEFAULT 'minor',       -- 'minor' | 'major' | 'critical'
  affected_components text[] NOT NULL DEFAULT '{}', -- e.g. ['database','email']
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  updates jsonb NOT NULL DEFAULT '[]'::jsonb -- [{ timestamp, status, message }]
);

CREATE INDEX IF NOT EXISTS idx_status_incidents_created
  ON status_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_incidents_status
  ON status_incidents(status);

CREATE TABLE IF NOT EXISTS status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  status text NOT NULL,           -- 'operational' | 'degraded' | 'down'
  latency_ms int,
  error text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_component_time
  ON status_history(component, recorded_at DESC);

-- RLS: public read, admin write
ALTER TABLE status_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_incidents_public_read" ON status_incidents;
CREATE POLICY "status_incidents_public_read"
  ON status_incidents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "status_history_public_read" ON status_history;
CREATE POLICY "status_history_public_read"
  ON status_history FOR SELECT
  USING (true);

-- Writes go through service-role (admin client / cron). No public write policy.
