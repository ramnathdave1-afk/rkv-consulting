-- =============================================================
-- 024: PRD Gap Fill — Deferred Maintenance, Vendor Scorecards,
--      Variance Alerts, Capital Reserves, Payments/Delinquency
-- =============================================================

-- ── 1. Vendor Scorecards ──
CREATE TABLE vendor_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  period_month INT NOT NULL,
  period_year INT NOT NULL,
  jobs_assigned INT DEFAULT 0,
  jobs_completed INT DEFAULT 0,
  avg_response_time_hrs NUMERIC(8,2),
  avg_completion_time_hrs NUMERIC(8,2),
  avg_tenant_rating NUMERIC(3,2),
  total_cost NUMERIC(12,2) DEFAULT 0,
  on_time_pct NUMERIC(5,2),
  callback_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, period_month, period_year)
);

CREATE INDEX idx_vendor_scorecards_org ON vendor_scorecards(org_id);
CREATE INDEX idx_vendor_scorecards_vendor ON vendor_scorecards(vendor_id);

ALTER TABLE vendor_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view vendor_scorecards" ON vendor_scorecards FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Service role all vendor_scorecards" ON vendor_scorecards FOR ALL USING (auth.role() = 'service_role');

-- Add tenant rating + response time to work orders
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS tenant_rating INT CHECK (tenant_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS tenant_feedback TEXT,
  ADD COLUMN IF NOT EXISTS vendor_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vendor_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_photos TEXT[],
  ADD COLUMN IF NOT EXISTS tenant_signed_off BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_issue_id UUID;

-- ── 2. Deferred Maintenance Tracker ──
CREATE TABLE deferred_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  occurrence_count INT DEFAULT 1,
  first_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_cost NUMERIC(12,2) DEFAULT 0,
  avg_cost_per_occurrence NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'monitoring'
    CHECK (status IN ('monitoring', 'scheduled', 'capital_project', 'resolved')),
  recommended_action TEXT,
  estimated_replacement_cost NUMERIC(12,2),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  related_work_order_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deferred_maint_org ON deferred_maintenance(org_id);
CREATE INDEX idx_deferred_maint_property ON deferred_maintenance(property_id);
CREATE INDEX idx_deferred_maint_category ON deferred_maintenance(category);

CREATE TRIGGER deferred_maint_updated_at
  BEFORE UPDATE ON deferred_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE deferred_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view deferred_maintenance" ON deferred_maintenance FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members manage deferred_maintenance" ON deferred_maintenance FOR ALL USING (org_id = auth_org_id());
CREATE POLICY "Service role all deferred_maintenance" ON deferred_maintenance FOR ALL USING (auth.role() = 'service_role');

-- ── 3. Capital Reserves ──
CREATE TABLE capital_reserves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  component TEXT NOT NULL,
  installed_year INT,
  useful_life_years INT,
  replacement_cost NUMERIC(12,2),
  current_age_years INT,
  remaining_life_years INT,
  annual_reserve_contribution NUMERIC(10,2),
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'replaced', 'deferred')),
  last_inspection_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_capital_reserves_org ON capital_reserves(org_id);
CREATE INDEX idx_capital_reserves_property ON capital_reserves(property_id);

CREATE TRIGGER capital_reserves_updated_at
  BEFORE UPDATE ON capital_reserves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE capital_reserves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view capital_reserves" ON capital_reserves FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members manage capital_reserves" ON capital_reserves FOR ALL USING (org_id = auth_org_id());
CREATE POLICY "Service role all capital_reserves" ON capital_reserves FOR ALL USING (auth.role() = 'service_role');

-- ── 4. Variance Alerts ──
CREATE TABLE variance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL
    CHECK (alert_type IN ('occupancy_drop', 'expense_spike', 'collection_low', 'maintenance_budget', 'custom')),
  severity TEXT NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'critical')),
  metric_name TEXT NOT NULL,
  threshold_value NUMERIC(10,2),
  actual_value NUMERIC(10,2),
  variance_pct NUMERIC(8,2),
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variance_alerts_org ON variance_alerts(org_id);
CREATE INDEX idx_variance_alerts_type ON variance_alerts(alert_type);
CREATE INDEX idx_variance_alerts_ack ON variance_alerts(acknowledged);
CREATE INDEX idx_variance_alerts_created ON variance_alerts(created_at DESC);

ALTER TABLE variance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view variance_alerts" ON variance_alerts FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members manage variance_alerts" ON variance_alerts FOR ALL USING (org_id = auth_org_id());
CREATE POLICY "Service role all variance_alerts" ON variance_alerts FOR ALL USING (auth.role() = 'service_role');

-- ── 5. Rent Payments (for delinquency tracking) ──
CREATE TABLE rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'partial', 'late', 'delinquent', 'waived', 'nsf')),
  days_late INT DEFAULT 0,
  late_fee NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT
    CHECK (payment_method IN ('ach', 'credit_card', 'check', 'cash', 'money_order', 'online_portal', 'other')),
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rent_payments_org ON rent_payments(org_id);
CREATE INDEX idx_rent_payments_lease ON rent_payments(lease_id);
CREATE INDEX idx_rent_payments_tenant ON rent_payments(tenant_id);
CREATE INDEX idx_rent_payments_status ON rent_payments(status);
CREATE INDEX idx_rent_payments_due ON rent_payments(due_date);

CREATE TRIGGER rent_payments_updated_at
  BEFORE UPDATE ON rent_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members view rent_payments" ON rent_payments FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members manage rent_payments" ON rent_payments FOR ALL USING (org_id = auth_org_id());
CREATE POLICY "Service role all rent_payments" ON rent_payments FOR ALL USING (auth.role() = 'service_role');

-- ── 6. Market Benchmarks (for comparative benchmarking) ──
CREATE TABLE market_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zip TEXT NOT NULL,
  city TEXT,
  state TEXT NOT NULL,
  property_type TEXT DEFAULT 'multifamily',
  avg_rent NUMERIC(10,2),
  avg_occupancy_rate NUMERIC(5,2),
  avg_expense_ratio NUMERIC(5,2),
  avg_cap_rate NUMERIC(5,2),
  avg_price_per_sqft NUMERIC(10,2),
  median_days_on_market INT,
  source TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(zip, property_type, collected_at)
);

CREATE INDEX idx_market_benchmarks_zip ON market_benchmarks(zip);
CREATE INDEX idx_market_benchmarks_state ON market_benchmarks(state);

-- ── 7. GDPR/CCPA — Data Deletion Requests ──
CREATE TABLE data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('tenant', 'prospect', 'user')),
  subject_id UUID NOT NULL,
  subject_email TEXT,
  regulation TEXT NOT NULL CHECK (regulation IN ('gdpr', 'ccpa', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'denied')),
  entities_deleted JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_deletion_org ON data_deletion_requests(org_id);
CREATE INDEX idx_data_deletion_status ON data_deletion_requests(status);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins view data_deletion_requests" ON data_deletion_requests FOR SELECT USING (
  org_id = auth_org_id()
  AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND org_id = auth_org_id() AND role IN ('admin', 'owner'))
);
CREATE POLICY "Service role all data_deletion_requests" ON data_deletion_requests FOR ALL USING (auth.role() = 'service_role');

-- ── 8. Update integrations platform check to include new connectors ──
ALTER TABLE integrations
  DROP CONSTRAINT IF EXISTS integrations_platform_check;
ALTER TABLE integrations
  ADD CONSTRAINT integrations_platform_check
  CHECK (platform IN ('appfolio', 'buildium', 'rent_manager', 'yardi', 'doorloop', 'realpage', 'entrata', 'propertyware', 'resman'));

-- ── 9. Update properties external_source to include new connectors ──
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_external_source_check;
ALTER TABLE properties
  ADD CONSTRAINT properties_external_source_check
  CHECK (external_source IN ('appfolio', 'buildium', 'yardi', 'rent_manager', 'doorloop', 'realpage', 'entrata', 'propertyware', 'resman'));
