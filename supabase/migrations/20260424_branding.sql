-- White-label branding columns for organizations
-- Adds brand identity fields used by tenant portal, transactional emails,
-- subdomain-aware login, and the settings/branding page.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#00bfa6';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_secondary_color text DEFAULT '#1a1a2e';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_logo_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_favicon_url text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_email_sender_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_email_reply_to text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_email_signature text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_custom_domain text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_subdomain text;

-- Legacy columns referenced by the existing settings UI / white-label.ts.
-- These coexist with the new brand_* columns so both old and new code paths
-- keep working during the rollout.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_from_name text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_from_address text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS white_label_enabled boolean DEFAULT false;

-- Subdomain must be unique when set, so acmepm.rkv-consulting.com → exactly one org.
CREATE UNIQUE INDEX IF NOT EXISTS organizations_brand_subdomain_key
  ON organizations (brand_subdomain)
  WHERE brand_subdomain IS NOT NULL;

-- Custom domain also unique when set.
CREATE UNIQUE INDEX IF NOT EXISTS organizations_brand_custom_domain_key
  ON organizations (brand_custom_domain)
  WHERE brand_custom_domain IS NOT NULL;
