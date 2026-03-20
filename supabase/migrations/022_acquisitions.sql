-- =============================================================
-- 022: Phase 3 — Acquisitions CRM, Deal Scoring, Seller Outreach
-- =============================================================

-- ── 1. Acquisition Deals (the core CRM record) ──
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Property info (may or may not link to an existing property)
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  -- Property details
  property_type TEXT DEFAULT 'single_family'
    CHECK (property_type IN ('single_family', 'multifamily', 'commercial', 'mixed_use', 'land')),
  bedrooms INT,
  bathrooms NUMERIC(3,1),
  square_footage INT,
  lot_size_sqft INT,
  year_built INT,
  -- Financials
  asking_price NUMERIC(12,2),
  arv NUMERIC(12,2),                          -- After Repair Value
  repair_estimate NUMERIC(12,2),
  mao NUMERIC(12,2),                          -- Maximum Allowable Offer
  mao_formula TEXT DEFAULT '70_rule',         -- 70_rule | custom
  offer_price NUMERIC(12,2),
  -- Scoring
  deal_score INT,                             -- 0-100 composite
  arv_confidence TEXT,                        -- high | medium | low
  market_score INT,                           -- 0-100
  risk_score INT,                             -- 0-100
  location_score INT,                         -- 0-100
  condition_score INT,                        -- 0-100
  score_reasoning TEXT,                       -- AI-generated explanation
  -- Pipeline
  pipeline_stage TEXT NOT NULL DEFAULT 'lead'
    CHECK (pipeline_stage IN ('lead', 'contacted', 'analyzing', 'offer_sent', 'negotiating', 'under_contract', 'due_diligence', 'closed', 'dead')),
  -- Seller info
  seller_name TEXT,
  seller_phone TEXT,
  seller_email TEXT,
  seller_type TEXT                             -- motivated | pre_foreclosure | absentee | tax_delinquent | estate | other
    CHECK (seller_type IN ('motivated', 'pre_foreclosure', 'absentee', 'tax_delinquent', 'estate', 'other')),
  -- Source
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'propstream', 'zillow', 'mls', 'wholesaler', 'driving_for_dollars', 'referral', 'direct_mail', 'other')),
  -- Portfolio fit
  portfolio_impact TEXT,                      -- AI analysis of how this deal affects portfolio
  -- Meta
  notes TEXT,
  photos TEXT[],
  metadata JSONB DEFAULT '{}',
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deals_org ON deals(org_id);
CREATE INDEX idx_deals_stage ON deals(pipeline_stage);
CREATE INDEX idx_deals_score ON deals(deal_score DESC);
CREATE INDEX idx_deals_city ON deals(city, state);
CREATE INDEX idx_deals_source ON deals(source);

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. Deal Comps (comparable sales for ARV) ──
CREATE TABLE deal_comps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  sale_price NUMERIC(12,2),
  sale_date DATE,
  bedrooms INT,
  bathrooms NUMERIC(3,1),
  square_footage INT,
  price_per_sqft NUMERIC(10,2),
  distance_miles NUMERIC(5,2),
  source TEXT,                                -- zillow | redfin | mls | attom | manual
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_comps_deal ON deal_comps(deal_id);
CREATE INDEX idx_deal_comps_org ON deal_comps(org_id);

-- ── 3. Deal Activity Log (pipeline history + notes) ──
CREATE TABLE deal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN ('stage_change', 'note', 'call', 'email', 'sms', 'offer', 'counter_offer', 'document', 'inspection', 'appraisal', 'ai_analysis')),
  from_stage TEXT,
  to_stage TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_activity_deal ON deal_activity(deal_id);
CREATE INDEX idx_deal_activity_org ON deal_activity(org_id);
CREATE INDEX idx_deal_activity_type ON deal_activity(activity_type);

-- ── 4. Seller Outreach Sequences ──
CREATE TABLE seller_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'responded')),
  sequence_type TEXT NOT NULL DEFAULT 'cold_outreach'
    CHECK (sequence_type IN ('cold_outreach', 'follow_up', 'offer', 'negotiation')),
  -- Steps tracking (5-step sequence)
  step_1_sent_at TIMESTAMPTZ,
  step_1_channel TEXT,                        -- sms | email
  step_2_sent_at TIMESTAMPTZ,
  step_2_channel TEXT,
  step_3_sent_at TIMESTAMPTZ,
  step_3_channel TEXT,
  step_4_sent_at TIMESTAMPTZ,
  step_4_channel TEXT,
  step_5_sent_at TIMESTAMPTZ,
  step_5_channel TEXT,
  -- Response tracking
  responded_at TIMESTAMPTZ,
  response_type TEXT                          -- interested | not_interested | callback | wrong_number | do_not_contact
    CHECK (response_type IN ('interested', 'not_interested', 'callback', 'wrong_number', 'do_not_contact')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_seller_seq_org ON seller_sequences(org_id);
CREATE INDEX idx_seller_seq_deal ON seller_sequences(deal_id);
CREATE INDEX idx_seller_seq_status ON seller_sequences(status);

CREATE TRIGGER seller_seq_updated_at
  BEFORE UPDATE ON seller_sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 5. RLS ──
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_comps ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_sequences ENABLE ROW LEVEL SECURITY;

-- Deals
CREATE POLICY "Org members view deals" ON deals FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert deals" ON deals FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update deals" ON deals FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Org members delete deals" ON deals FOR DELETE USING (org_id = auth_org_id());
CREATE POLICY "Service role all deals" ON deals FOR ALL USING (auth.role() = 'service_role');

-- Deal Comps
CREATE POLICY "Org members view deal_comps" ON deal_comps FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert deal_comps" ON deal_comps FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Service role all deal_comps" ON deal_comps FOR ALL USING (auth.role() = 'service_role');

-- Deal Activity
CREATE POLICY "Org members view deal_activity" ON deal_activity FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert deal_activity" ON deal_activity FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Service role all deal_activity" ON deal_activity FOR ALL USING (auth.role() = 'service_role');

-- Seller Sequences
CREATE POLICY "Org members view seller_sequences" ON seller_sequences FOR SELECT USING (org_id = auth_org_id());
CREATE POLICY "Org members insert seller_sequences" ON seller_sequences FOR INSERT WITH CHECK (org_id = auth_org_id());
CREATE POLICY "Org members update seller_sequences" ON seller_sequences FOR UPDATE USING (org_id = auth_org_id());
CREATE POLICY "Service role all seller_sequences" ON seller_sequences FOR ALL USING (auth.role() = 'service_role');
