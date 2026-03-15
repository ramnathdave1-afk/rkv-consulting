-- Ghost Sites (main pipeline entity)
CREATE TABLE ghost_sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  state TEXT NOT NULL,
  county TEXT,
  acreage DOUBLE PRECISION,
  zoning TEXT,
  pipeline_stage TEXT NOT NULL DEFAULT 'ghost_site'
    CHECK (pipeline_stage IN ('ghost_site', 'due_diligence', 'loi', 'under_contract', 'closed')),
  target_mw DOUBLE PRECISION,
  nearest_substation_id UUID REFERENCES substations(id),
  distance_to_substation_mi DOUBLE PRECISION,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ghost_sites_set_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ghost_sites_geom_trigger
  BEFORE INSERT OR UPDATE ON ghost_sites
  FOR EACH ROW EXECUTE FUNCTION ghost_sites_set_geom();

CREATE TRIGGER ghost_sites_updated_at
  BEFORE UPDATE ON ghost_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_ghost_sites_org_id ON ghost_sites(org_id);
CREATE INDEX idx_ghost_sites_geom ON ghost_sites USING GIST(geom);
CREATE INDEX idx_ghost_sites_stage ON ghost_sites(pipeline_stage);
CREATE INDEX idx_ghost_sites_state ON ghost_sites(state);
