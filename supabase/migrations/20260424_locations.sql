-- Multi-Location Support
-- Adds locations table, attaches location_id to scoped resources, and
-- backfills a default "Main Office" location for every existing org.

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL, -- 'Phoenix', 'Tucson HQ', etc.
  slug text NOT NULL, -- 'phoenix', 'tucson-hq'
  address_line1 text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  manager_user_id uuid, -- references profiles.user_id
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(org_id) WHERE is_active = true;

-- Attach location_id to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location_id);

-- Optional: scope work_orders + leases to a location
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_location ON work_orders(location_id);

ALTER TABLE leases ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leases_location ON leases(location_id);

-- Optional: per-user location access control
CREATE TABLE IF NOT EXISTS user_location_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- 'admin', 'manager', 'member', 'viewer'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_user_location_access_user ON user_location_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_access_loc ON user_location_access(location_id);

-- Auto-create a default "Main Office" location for each existing org so
-- legacy data continues to work without changes.
INSERT INTO locations (org_id, name, slug, is_default)
SELECT id, 'Main Office', 'main', true FROM organizations
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE org_id = organizations.id);

-- Backfill: any properties without a location -> assign to org's default location
UPDATE properties p
SET location_id = (SELECT id FROM locations WHERE org_id = p.org_id AND is_default = true LIMIT 1)
WHERE location_id IS NULL;

-- updated_at trigger (best-effort: ignore if function doesn't exist yet)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_locations_updated_at ON locations;
    CREATE TRIGGER trg_locations_updated_at
      BEFORE UPDATE ON locations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- RLS: locations are tenant-scoped by org_id. Mirror the org-scoped policies
-- already used elsewhere in this codebase (see 013_rls_policies.sql).
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Drop pre-existing policies of the same name so this migration is idempotent
  DROP POLICY IF EXISTS locations_select ON locations;
  DROP POLICY IF EXISTS locations_insert ON locations;
  DROP POLICY IF EXISTS locations_update ON locations;
  DROP POLICY IF EXISTS locations_delete ON locations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY locations_select ON locations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY locations_insert ON locations
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY locations_update ON locations
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY locations_delete ON locations
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS user_location_access_select ON user_location_access;
  DROP POLICY IF EXISTS user_location_access_write ON user_location_access;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY user_location_access_select ON user_location_access
  FOR SELECT USING (
    location_id IN (
      SELECT id FROM locations WHERE org_id IN (
        SELECT org_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY user_location_access_write ON user_location_access
  FOR ALL USING (
    location_id IN (
      SELECT id FROM locations WHERE org_id IN (
        SELECT org_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );
