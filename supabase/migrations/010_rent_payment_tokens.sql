-- ============================================================================
-- Rent Payment Tokens — Token-based tenant payment links
-- ============================================================================

CREATE TABLE IF NOT EXISTS rent_payment_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  amount_due NUMERIC(12,2) NOT NULL,
  due_date DATE,
  is_recurring BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rent_payment_tokens_token ON rent_payment_tokens(token);
CREATE INDEX IF NOT EXISTS idx_rent_payment_tokens_tenant ON rent_payment_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_payment_tokens_user ON rent_payment_tokens(user_id);

-- RLS
ALTER TABLE rent_payment_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rent payment tokens"
  ON rent_payment_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read access by token (for tenant payment page)
CREATE POLICY "Public read by token"
  ON rent_payment_tokens FOR SELECT
  USING (true);
