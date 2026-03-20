-- =============================================================
-- 020: Property Management Platform Tables
-- Additive migration — does not drop or alter existing tables
-- =============================================================

-- ── 1. Properties ──
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'multifamily'
    CHECK (property_type IN ('multifamily', 'single_family', 'commercial', 'mixed_use', 'hoa')),
  unit_count INT NOT NULL DEFAULT 0,
  year_built INT,
  square_footage INT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  photo_url TEXT,
  metadata JSONB DEFAULT '{}',
  external_id TEXT,
  external_source TEXT
    CHECK (external_source IN ('appfolio', 'buildium', 'yardi', 'rent_manager')),
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_org ON properties(org_id);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_external ON properties(external_source, external_id);

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. Units ──
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor_plan TEXT,
  bedrooms INT DEFAULT 0,
  bathrooms NUMERIC(3,1) DEFAULT 1,
  square_footage INT,
  market_rent NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'vacant'
    CHECK (status IN ('occupied', 'vacant', 'notice', 'make_ready', 'down', 'model')),
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(property_id, unit_number)
);

CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_org ON units(org_id);
CREATE INDEX idx_units_status ON units(status);

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 3. Tenants ──
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'applicant', 'approved', 'active', 'notice', 'past', 'denied')),
  source TEXT,
  move_in_date DATE,
  move_out_date DATE,
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_org ON tenants(org_id);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_phone ON tenants(phone);
CREATE INDEX idx_tenants_email ON tenants(email);

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. Leases ──
CREATE TABLE leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lease_start DATE NOT NULL,
  lease_end DATE NOT NULL,
  monthly_rent NUMERIC(10,2) NOT NULL,
  security_deposit NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'expired', 'terminated', 'renewed')),
  renewal_offered BOOLEAN DEFAULT false,
  renewal_rent NUMERIC(10,2),
  external_id TEXT,
  terms JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leases_org ON leases(org_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_tenant ON leases(tenant_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_leases_end_date ON leases(lease_end);

CREATE TRIGGER leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 5. Vendors ──
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  specialty TEXT[] DEFAULT '{}',
  hourly_rate NUMERIC(10,2),
  is_preferred BOOLEAN DEFAULT false,
  rating NUMERIC(3,2),
  notes TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendors_org ON vendors(org_id);

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. Work Orders ──
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'pest', 'structural', 'cosmetic', 'safety', 'general', 'turnover')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('emergency', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'assigned', 'in_progress', 'parts_needed', 'completed', 'closed', 'cancelled')),
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'tenant_portal', 'ai_chat', 'phone', 'email', 'inspection')),
  scheduled_date DATE,
  completed_date DATE,
  cost NUMERIC(10,2),
  photos TEXT[],
  ai_summary TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_orders_org ON work_orders(org_id);
CREATE INDEX idx_work_orders_property ON work_orders(property_id);
CREATE INDEX idx_work_orders_unit ON work_orders(unit_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_priority ON work_orders(priority);
CREATE INDEX idx_work_orders_vendor ON work_orders(vendor_id);

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Conversations ──
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'sms'
    CHECK (channel IN ('sms', 'email', 'web_chat', 'voice')),
  twilio_phone TEXT,
  participant_phone TEXT,
  participant_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'escalated', 'ai_handling', 'human_handling')),
  ai_context JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_org ON conversations(org_id);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_participant ON conversations(participant_phone);
CREATE INDEX idx_conversations_status ON conversations(status);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 8. Messages ──
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('tenant', 'staff', 'ai', 'system')),
  sender_id UUID,
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms'
    CHECK (channel IN ('sms', 'email', 'web_chat', 'voice')),
  twilio_sid TEXT,
  status TEXT DEFAULT 'delivered'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  ai_classified_intent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_org ON messages(org_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- ── 9. Owner Reports ──
CREATE TABLE owner_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (report_type IN ('monthly', 'quarterly', 'annual', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_income NUMERIC(12,2),
  total_expenses NUMERIC(12,2),
  net_operating_income NUMERIC(12,2),
  occupancy_rate NUMERIC(5,2),
  ai_summary TEXT,
  data JSONB DEFAULT '{}',
  pdf_url TEXT,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_owner_reports_org ON owner_reports(org_id);
CREATE INDEX idx_owner_reports_property ON owner_reports(property_id);

-- ── 10. PM Platform Integrations ──
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('appfolio', 'buildium', 'rent_manager', 'yardi')),
  auth_type TEXT NOT NULL DEFAULT 'api_key'
    CHECK (auth_type IN ('api_key', 'oauth2')),
  credentials_encrypted JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_records INT DEFAULT 0,
  sync_config JSONB DEFAULT '{}',
  webhook_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, platform)
);

CREATE INDEX idx_integrations_org ON integrations(org_id);

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 11. Sync Jobs ──
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('properties', 'units', 'tenants', 'leases', 'work_orders', 'vendors', 'full')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  records_fetched INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_skipped INT DEFAULT 0,
  records_errored INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_jobs_integration ON sync_jobs(integration_id);
CREATE INDEX idx_sync_jobs_org ON sync_jobs(org_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);

-- ── 12. Org Phone Numbers ──
CREATE TABLE org_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL,
  friendly_name TEXT,
  purpose TEXT NOT NULL DEFAULT 'general'
    CHECK (purpose IN ('general', 'leasing', 'maintenance', 'emergency')),
  is_active BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_phones_org ON org_phone_numbers(org_id);
CREATE INDEX idx_org_phones_number ON org_phone_numbers(phone_number);

-- ── 13. Enable RLS on all new tables ──

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_phone_numbers ENABLE ROW LEVEL SECURITY;

-- ── 14. RLS Policies ──

-- Properties
CREATE POLICY "Org members view properties" ON properties
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert properties" ON properties
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update properties" ON properties
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Org members delete properties" ON properties
  FOR DELETE USING (org_id = auth_org_id());
CREATE POLICY "Service role all properties" ON properties
  FOR ALL USING (auth.role() = 'service_role');

-- Units
CREATE POLICY "Org members view units" ON units
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert units" ON units
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update units" ON units
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all units" ON units
  FOR ALL USING (auth.role() = 'service_role');

-- Tenants
CREATE POLICY "Org members view tenants" ON tenants
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert tenants" ON tenants
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update tenants" ON tenants
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all tenants" ON tenants
  FOR ALL USING (auth.role() = 'service_role');

-- Leases
CREATE POLICY "Org members view leases" ON leases
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert leases" ON leases
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update leases" ON leases
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all leases" ON leases
  FOR ALL USING (auth.role() = 'service_role');

-- Vendors
CREATE POLICY "Org members view vendors" ON vendors
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert vendors" ON vendors
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update vendors" ON vendors
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all vendors" ON vendors
  FOR ALL USING (auth.role() = 'service_role');

-- Work Orders
CREATE POLICY "Org members view work_orders" ON work_orders
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert work_orders" ON work_orders
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update work_orders" ON work_orders
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all work_orders" ON work_orders
  FOR ALL USING (auth.role() = 'service_role');

-- Conversations
CREATE POLICY "Org members view conversations" ON conversations
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert conversations" ON conversations
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update conversations" ON conversations
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

-- Messages
CREATE POLICY "Org members view messages" ON messages
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert messages" ON messages
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Service role all messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- Owner Reports
CREATE POLICY "Org members view owner_reports" ON owner_reports
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert owner_reports" ON owner_reports
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Service role all owner_reports" ON owner_reports
  FOR ALL USING (auth.role() = 'service_role');

-- Integrations (admin-only for write)
CREATE POLICY "Org members view integrations" ON integrations
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org admins insert integrations" ON integrations
  FOR INSERT WITH CHECK (
    org_id = auth_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND org_id = auth_org_id() AND role IN ('admin', 'owner'))
  );
CREATE POLICY "Org admins update integrations" ON integrations
  FOR UPDATE USING (
    org_id = auth_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND org_id = auth_org_id() AND role IN ('admin', 'owner'))
  );
CREATE POLICY "Service role all integrations" ON integrations
  FOR ALL USING (auth.role() = 'service_role');

-- Sync Jobs
CREATE POLICY "Org members view sync_jobs" ON sync_jobs
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Service role all sync_jobs" ON sync_jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Org Phone Numbers
CREATE POLICY "Org members view phone_numbers" ON org_phone_numbers
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Service role all phone_numbers" ON org_phone_numbers
  FOR ALL USING (auth.role() = 'service_role');

-- ── 15. PM-specific plan limits ──
INSERT INTO plan_limits (plan, feature, max_value) VALUES
  ('explorer', 'properties', 3),
  ('explorer', 'units', 20),
  ('explorer', 'work_orders', -1),
  ('explorer', 'conversations', 50),
  ('pro', 'properties', 50),
  ('pro', 'units', 500),
  ('pro', 'work_orders', -1),
  ('pro', 'conversations', -1),
  ('enterprise', 'properties', -1),
  ('enterprise', 'units', -1),
  ('enterprise', 'work_orders', -1),
  ('enterprise', 'conversations', -1)
ON CONFLICT (plan, feature) DO NOTHING;
