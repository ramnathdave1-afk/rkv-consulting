-- =============================================================
-- 021: Phase 2 — Showings, Lease Renewals, Financial Transactions
-- =============================================================

-- ── 1. Showings ──
CREATE TABLE showings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  prospect_name TEXT,
  prospect_phone TEXT,
  prospect_email TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('requested', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  notes TEXT,
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_chat', 'website', 'phone', 'walk_in')),
  follow_up_status TEXT DEFAULT 'pending'
    CHECK (follow_up_status IN ('pending', 'sent', 'responded', 'applied', 'skipped')),
  follow_up_sent_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES auth.users(id),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_showings_org ON showings(org_id);
CREATE INDEX idx_showings_property ON showings(property_id);
CREATE INDEX idx_showings_scheduled ON showings(scheduled_at);
CREATE INDEX idx_showings_status ON showings(status);
CREATE INDEX idx_showings_tenant ON showings(tenant_id);

CREATE TRIGGER showings_updated_at
  BEFORE UPDATE ON showings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. Lease Renewal Sequences ──
CREATE TABLE lease_renewal_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'expired')),
  trigger_date DATE NOT NULL,
  step_90_sent_at TIMESTAMPTZ,
  step_90_channel TEXT,
  step_60_sent_at TIMESTAMPTZ,
  step_60_channel TEXT,
  step_30_sent_at TIMESTAMPTZ,
  step_30_channel TEXT,
  renewal_offered_at TIMESTAMPTZ,
  renewal_accepted_at TIMESTAMPTZ,
  renewal_declined_at TIMESTAMPTZ,
  proposed_rent NUMERIC(10,2),
  rent_increase_pct NUMERIC(5,2),
  tenant_response TEXT DEFAULT 'no_response'
    CHECK (tenant_response IN ('accepted', 'declined', 'negotiating', 'no_response')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_seq_org ON lease_renewal_sequences(org_id);
CREATE INDEX idx_renewal_seq_lease ON lease_renewal_sequences(lease_id);
CREATE INDEX idx_renewal_seq_status ON lease_renewal_sequences(status);
CREATE INDEX idx_renewal_seq_trigger ON lease_renewal_sequences(trigger_date);

CREATE TRIGGER renewal_seq_updated_at
  BEFORE UPDATE ON lease_renewal_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 3. Financial Transactions ──
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  period_month INT,
  period_year INT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_tx_org ON financial_transactions(org_id);
CREATE INDEX idx_fin_tx_property ON financial_transactions(property_id);
CREATE INDEX idx_fin_tx_date ON financial_transactions(transaction_date);
CREATE INDEX idx_fin_tx_type ON financial_transactions(type);
CREATE INDEX idx_fin_tx_period ON financial_transactions(period_year, period_month);

-- ── 4. RLS ──
ALTER TABLE showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_renewal_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Showings
CREATE POLICY "Org members view showings" ON showings
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert showings" ON showings
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update showings" ON showings
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all showings" ON showings
  FOR ALL USING (auth.role() = 'service_role');

-- Lease Renewal Sequences
CREATE POLICY "Org members view renewal_sequences" ON lease_renewal_sequences
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert renewal_sequences" ON lease_renewal_sequences
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update renewal_sequences" ON lease_renewal_sequences
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all renewal_sequences" ON lease_renewal_sequences
  FOR ALL USING (auth.role() = 'service_role');

-- Financial Transactions
CREATE POLICY "Org members view financial_transactions" ON financial_transactions
  FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert financial_transactions" ON financial_transactions
  FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update financial_transactions" ON financial_transactions
  FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all financial_transactions" ON financial_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- ── 5. Plan limits for showings ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plan_limits') THEN
    PERFORM 1; -- plan_limits insert skipped
  END IF;
END $$;