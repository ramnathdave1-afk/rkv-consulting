-- API Key Infrastructure for Developer API Product
-- Supports versioned public API access with rate limiting and usage tracking.

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                              -- e.g. "Production Key", "Dev Key"
  key_hash TEXT NOT NULL UNIQUE,                   -- SHA-256 hash of the actual key
  key_prefix TEXT NOT NULL,                        -- First 8 chars for identification (mn_live_xxxx)
  scopes TEXT[] NOT NULL DEFAULT '{read}',         -- read, write, admin
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,      -- requests per minute
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;

-- API Usage Tracking
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_params JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partition-friendly index (query by key + time range)
CREATE INDEX idx_api_usage_key_time ON api_usage(api_key_id, created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX idx_api_usage_created ON api_usage(created_at DESC);

-- Rate limiting: count requests in current minute window
CREATE OR REPLACE FUNCTION check_rate_limit(p_key_hash TEXT)
RETURNS TABLE(allowed BOOLEAN, current_count BIGINT, limit_rpm INTEGER) AS $$
DECLARE
  v_key_id UUID;
  v_limit INTEGER;
  v_count BIGINT;
BEGIN
  -- Get key info
  SELECT ak.id, ak.rate_limit_rpm INTO v_key_id, v_limit
  FROM api_keys ak
  WHERE ak.key_hash = p_key_hash AND ak.is_active = TRUE
    AND (ak.expires_at IS NULL OR ak.expires_at > now());

  IF v_key_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::BIGINT, 0;
    RETURN;
  END IF;

  -- Count requests in last minute
  SELECT COUNT(*) INTO v_count
  FROM api_usage
  WHERE api_key_id = v_key_id
    AND created_at > now() - INTERVAL '1 minute';

  -- Update last_used_at
  UPDATE api_keys SET last_used_at = now() WHERE id = v_key_id;

  RETURN QUERY SELECT (v_count < v_limit), v_count, v_limit;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old usage data (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_api_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM api_usage WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Org members can manage their own keys
CREATE POLICY "Org members manage api_keys"
  ON api_keys FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role api_keys"
  ON api_keys FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role api_usage"
  ON api_usage FOR ALL
  USING (auth.role() = 'service_role');

-- Users can read their own usage
CREATE POLICY "Org members read api_usage"
  ON api_usage FOR SELECT
  USING (
    api_key_id IN (
      SELECT ak.id FROM api_keys ak
      JOIN profiles p ON p.org_id = ak.org_id
      WHERE p.user_id = auth.uid()
    )
  );
