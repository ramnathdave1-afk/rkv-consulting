-- ============================================================
-- Migration 014: Generalize Platform for Multi-Vertical Support
-- Renames ghost_sites → sites, adds vertical support,
-- generalizes substations beyond PJM, expands market_intelligence
-- ============================================================

-- ── 1. Rename ghost_sites → sites ──

ALTER TABLE ghost_sites RENAME TO sites;

-- Add vertical support
ALTER TABLE sites ADD COLUMN vertical TEXT NOT NULL DEFAULT 'data_center'
  CHECK (vertical IN ('data_center', 'solar', 'wind', 'ev_charging', 'industrial', 'residential', 'mixed_use'));

-- Add JSONB for vertical-specific metadata
ALTER TABLE sites ADD COLUMN attributes JSONB DEFAULT '{}';

-- Generalize capacity fields
ALTER TABLE sites RENAME COLUMN target_mw TO target_capacity;
ALTER TABLE sites ADD COLUMN capacity_unit TEXT DEFAULT 'MW';

-- Add ISO region (replaces PJM-only assumption)
ALTER TABLE sites ADD COLUMN iso_region TEXT;

-- Add municipality and parcel link
ALTER TABLE sites ADD COLUMN municipality TEXT;
ALTER TABLE sites ADD COLUMN parcel_id UUID REFERENCES parcels(id);

-- Rename indexes
ALTER INDEX idx_ghost_sites_org_id RENAME TO idx_sites_org_id;
ALTER INDEX idx_ghost_sites_geom RENAME TO idx_sites_geom;
ALTER INDEX idx_ghost_sites_stage RENAME TO idx_sites_stage;
ALTER INDEX idx_ghost_sites_state RENAME TO idx_sites_state;

-- Recreate trigger function for new table name
CREATE OR REPLACE FUNCTION sites_set_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ghost_sites_geom_trigger ON sites;
CREATE TRIGGER sites_geom_trigger
  BEFORE INSERT OR UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION sites_set_geom();

DROP TRIGGER IF EXISTS ghost_sites_updated_at ON sites;
CREATE TRIGGER sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update pipeline_stage check constraint
ALTER TABLE sites DROP CONSTRAINT IF EXISTS ghost_sites_pipeline_stage_check;
ALTER TABLE sites ADD CONSTRAINT sites_pipeline_stage_check
  CHECK (pipeline_stage IN ('prospect', 'due_diligence', 'loi', 'under_contract', 'closed'));

-- Migrate existing 'ghost_site' stage to 'prospect'
UPDATE sites SET pipeline_stage = 'prospect' WHERE pipeline_stage = 'ghost_site';

-- Add index on vertical
CREATE INDEX idx_sites_vertical ON sites(vertical);

-- ── 2. Update site_scores ──

-- Add flexible scoring support
ALTER TABLE site_scores ADD COLUMN dimension_scores JSONB DEFAULT '{}';
ALTER TABLE site_scores ADD COLUMN scoring_profile TEXT DEFAULT 'data_center';

-- Update FK reference (already points to the renamed table)

-- ── 3. Generalize substations ──

ALTER TABLE substations RENAME COLUMN pjm_zone TO iso_zone;
ALTER TABLE substations ADD COLUMN iso_region TEXT DEFAULT 'PJM';
ALTER TABLE substations ADD COLUMN interconnection_queue JSONB;
ALTER TABLE substations ADD COLUMN last_updated TIMESTAMPTZ DEFAULT now();

-- ── 4. Expand market_intelligence ──

ALTER TABLE market_intelligence ADD COLUMN vertical TEXT DEFAULT 'data_center';
ALTER TABLE market_intelligence ADD COLUMN iso_region TEXT DEFAULT 'PJM';

-- ── 5. Expand agent_activity_log for new agents ──

ALTER TABLE agent_activity_log DROP CONSTRAINT IF EXISTS agent_activity_log_agent_name_check;
ALTER TABLE agent_activity_log ADD CONSTRAINT agent_activity_log_agent_name_check
  CHECK (agent_name IN ('alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'));

-- Update FK from ghost_sites to sites (already done via rename)

-- ── 6. Update RLS policies ──

-- Drop old policies referencing ghost_sites
DROP POLICY IF EXISTS "Users can view org sites" ON sites;
DROP POLICY IF EXISTS "Users can insert org sites" ON sites;
DROP POLICY IF EXISTS "Users can update org sites" ON sites;

-- Recreate policies on renamed table
CREATE POLICY "Users can view org sites" ON sites
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "Users can insert org sites" ON sites
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update org sites" ON sites
  FOR UPDATE USING (org_id = auth_org_id());

-- Update site_scores policy (references ghost_sites → sites)
DROP POLICY IF EXISTS "Users can view site scores" ON site_scores;
CREATE POLICY "Users can view site scores" ON site_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sites WHERE id = site_scores.site_id AND org_id = auth_org_id())
  );

-- Update pipeline_history policy
DROP POLICY IF EXISTS "Users can view pipeline history" ON pipeline_history;
CREATE POLICY "Users can view pipeline history" ON pipeline_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sites WHERE id = pipeline_history.site_id AND org_id = auth_org_id())
  );

-- Update reports policy
DROP POLICY IF EXISTS "Users can view reports" ON reports;
CREATE POLICY "Users can view reports" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sites WHERE id = reports.site_id AND org_id = auth_org_id())
  );

-- ── 7. Recreate materialized view ──

DROP MATERIALIZED VIEW IF EXISTS site_map_data;

CREATE MATERIALIZED VIEW site_map_data AS
SELECT
  s.id,
  s.name,
  s.lat,
  s.lng,
  s.state,
  s.pipeline_stage,
  s.target_capacity,
  s.capacity_unit,
  s.vertical,
  s.acreage,
  s.org_id,
  ss.composite_score,
  sub.name AS nearest_substation_name,
  s.distance_to_substation_mi
FROM sites s
LEFT JOIN LATERAL (
  SELECT composite_score
  FROM site_scores
  WHERE site_id = s.id
  ORDER BY scored_at DESC
  LIMIT 1
) ss ON true
LEFT JOIN substations sub ON sub.id = s.nearest_substation_id;

CREATE UNIQUE INDEX idx_site_map_data_id ON site_map_data(id);

-- ── 8. Update find_golden_sites function ──

CREATE OR REPLACE FUNCTION find_golden_sites(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 25,
  min_acres DOUBLE PRECISION DEFAULT 40,
  min_available_mw DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  substation_id UUID,
  substation_name TEXT,
  substation_lat DOUBLE PRECISION,
  substation_lng DOUBLE PRECISION,
  available_mw DOUBLE PRECISION,
  parcel_id UUID,
  parcel_acreage DOUBLE PRECISION,
  parcel_zoning TEXT,
  parcel_lat DOUBLE PRECISION,
  parcel_lng DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS substation_id,
    s.name AS substation_name,
    s.lat AS substation_lat,
    s.lng AS substation_lng,
    s.available_mw,
    p.id AS parcel_id,
    p.acreage AS parcel_acreage,
    p.zoning AS parcel_zoning,
    p.lat AS parcel_lat,
    p.lng AS parcel_lng,
    ST_Distance(
      s.geom::geography,
      p.geom::geography
    ) / 1609.34 AS distance_miles
  FROM substations s
  CROSS JOIN LATERAL (
    SELECT *
    FROM parcels p2
    WHERE p2.acreage >= min_acres
      AND ST_DWithin(
        s.geom::geography,
        p2.geom::geography,
        radius_miles * 1609.34
      )
    ORDER BY ST_Distance(s.geom::geography, p2.geom::geography)
    LIMIT 5
  ) p
  WHERE s.available_mw >= min_available_mw
    AND ST_DWithin(
      s.geom::geography,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      radius_miles * 1609.34 * 4
    )
  ORDER BY s.available_mw DESC, distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- ── 9. Add organization-level vertical config ──

ALTER TABLE organizations ADD COLUMN enabled_verticals TEXT[] DEFAULT '{data_center}';
ALTER TABLE organizations ADD COLUMN default_vertical TEXT DEFAULT 'data_center';
ALTER TABLE organizations ADD COLUMN coverage_bounds JSONB;
