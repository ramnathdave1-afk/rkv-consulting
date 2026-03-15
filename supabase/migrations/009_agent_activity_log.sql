-- Agent Activity Log
CREATE TABLE agent_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT CHECK (agent_name IN ('alpha', 'beta', 'gamma', 'delta')),
  action TEXT NOT NULL,
  details JSONB,
  org_id UUID REFERENCES organizations(id),
  site_id UUID REFERENCES ghost_sites(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_log_agent_name ON agent_activity_log(agent_name);
CREATE INDEX idx_agent_log_created_at ON agent_activity_log(created_at DESC);
CREATE INDEX idx_agent_log_org_id ON agent_activity_log(org_id);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
