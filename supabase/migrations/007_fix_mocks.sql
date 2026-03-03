-- ============================================================================
-- Migration 007: Fix Mocks — Schema additions for production-ready features
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tenant extended fields
-- ---------------------------------------------------------------------------
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC DEFAULT 50;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grace_days INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Bank Transfer';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS emergency_contact JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vehicle_info JSONB;

-- ---------------------------------------------------------------------------
-- 2. Property land value (for real depreciation calculation)
-- ---------------------------------------------------------------------------
ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_value NUMERIC;

-- ---------------------------------------------------------------------------
-- 3. Profile effective tax rate
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS effective_tax_rate NUMERIC DEFAULT 0.30;

-- ---------------------------------------------------------------------------
-- 4. 1031 Exchange Tracker
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exchanges_1031 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relinquished_property TEXT NOT NULL,
  sale_price NUMERIC NOT NULL,
  sale_date DATE NOT NULL,
  identification_deadline DATE GENERATED ALWAYS AS (sale_date + 45) STORED,
  completion_deadline DATE GENERATED ALWAYS AS (sale_date + 180) STORED,
  identified_properties JSONB DEFAULT '[]',
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'identified', 'under_contract', 'closed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exchanges_1031 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exchanges" ON exchanges_1031
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exchanges_1031_user ON exchanges_1031(user_id);
