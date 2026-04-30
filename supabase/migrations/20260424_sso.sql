-- SSO/SAML configuration for RKV Consulting orgs
-- Supabase handles the SAML protocol; we store per-org provider configs.

CREATE TABLE IF NOT EXISTS sso_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  provider text NOT NULL, -- 'okta', 'azure_ad', 'google_workspace', 'onelogin', 'generic_saml'
  provider_id text, -- Supabase SSO provider ID after registration
  metadata_xml text, -- IDP metadata XML
  metadata_url text, -- OR URL to IDP metadata
  domain_allowlist text[], -- ['acmepm.com'] — auto-route users with these email domains
  enabled boolean DEFAULT false,
  attribute_mapping jsonb DEFAULT '{}', -- map SAML attrs to user fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS idx_sso_org ON sso_configurations(org_id);
CREATE INDEX IF NOT EXISTS idx_sso_domains ON sso_configurations USING GIN (domain_allowlist);

-- Add SSO marker columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sso_subject text; -- the NameID from SAML
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_method text DEFAULT 'password'; -- 'password', 'sso_saml', 'magic_link'

-- RLS: only org admins can read/write their org's SSO config
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sso_select_own_org" ON sso_configurations;
CREATE POLICY "sso_select_own_org" ON sso_configurations
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sso_modify_admin_only" ON sso_configurations;
CREATE POLICY "sso_modify_admin_only" ON sso_configurations
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
