-- =============================================================
-- 019: Subscriptions & Usage Tracking
-- =============================================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'explorer' CHECK (plan IN ('explorer', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('sites', 'api_calls', 'feasibility', 'chat_messages', 'team_members', 'pdf_reports')),
  count INT NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_usage_org_feature_period ON usage_records(org_id, feature, period_start);
CREATE INDEX idx_usage_period ON usage_records(period_end);

-- Plan limits reference
CREATE TABLE IF NOT EXISTS plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL CHECK (plan IN ('explorer', 'pro', 'enterprise')),
  feature TEXT NOT NULL,
  max_value INT NOT NULL,
  UNIQUE(plan, feature)
);

-- Seed plan limits
INSERT INTO plan_limits (plan, feature, max_value) VALUES
  ('explorer', 'sites', 5),
  ('explorer', 'api_calls', 100),
  ('explorer', 'feasibility', 3),
  ('explorer', 'chat_messages', 10),
  ('explorer', 'team_members', 1),
  ('explorer', 'pdf_reports', 0),
  ('pro', 'sites', 50),
  ('pro', 'api_calls', 10000),
  ('pro', 'feasibility', -1),
  ('pro', 'chat_messages', -1),
  ('pro', 'team_members', 5),
  ('pro', 'pdf_reports', -1),
  ('enterprise', 'sites', -1),
  ('enterprise', 'api_calls', -1),
  ('enterprise', 'feasibility', -1),
  ('enterprise', 'chat_messages', -1),
  ('enterprise', 'team_members', -1),
  ('enterprise', 'pdf_reports', -1)
ON CONFLICT (plan, feature) DO NOTHING;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(p_org_id UUID, p_feature TEXT)
RETURNS JSONB AS $$
DECLARE
  v_plan TEXT;
  v_limit INT;
  v_used INT;
  v_period_start TIMESTAMPTZ;
BEGIN
  -- Get current plan
  SELECT plan INTO v_plan FROM subscriptions WHERE org_id = p_org_id AND status IN ('active', 'trialing');
  IF v_plan IS NULL THEN v_plan := 'explorer'; END IF;

  -- Get limit
  SELECT max_value INTO v_limit FROM plan_limits WHERE plan = v_plan AND feature = p_feature;
  IF v_limit IS NULL THEN v_limit := 0; END IF;
  IF v_limit = -1 THEN RETURN jsonb_build_object('allowed', true, 'used', 0, 'limit', -1, 'plan', v_plan); END IF;

  -- Get current period usage
  v_period_start := date_trunc('month', now());
  SELECT COALESCE(count, 0) INTO v_used FROM usage_records
    WHERE org_id = p_org_id AND feature = p_feature AND period_start = v_period_start;

  RETURN jsonb_build_object(
    'allowed', v_used < v_limit,
    'used', COALESCE(v_used, 0),
    'limit', v_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(p_org_id UUID, p_feature TEXT, p_amount INT DEFAULT 1)
RETURNS VOID AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  v_period_start := date_trunc('month', now());
  v_period_end := date_trunc('month', now()) + interval '1 month';

  INSERT INTO usage_records (org_id, feature, count, period_start, period_end)
  VALUES (p_org_id, p_feature, p_amount, v_period_start, v_period_end)
  ON CONFLICT (org_id, feature, period_start)
  DO UPDATE SET count = usage_records.count + p_amount, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view own subscription"
  ON subscriptions FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Org members can view own usage"
  ON usage_records FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages usage"
  ON usage_records FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Anyone can read plan limits"
  ON plan_limits FOR SELECT
  USING (true);
