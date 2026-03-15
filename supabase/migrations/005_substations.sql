-- Substations with PostGIS geometry
CREATE TABLE substations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  voltage_kv DOUBLE PRECISION,
  capacity_mw DOUBLE PRECISION,
  available_mw DOUBLE PRECISION,
  utility TEXT,
  state TEXT NOT NULL,
  pjm_zone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-populate geometry from lat/lng
CREATE OR REPLACE FUNCTION substations_set_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER substations_geom_trigger
  BEFORE INSERT OR UPDATE ON substations
  FOR EACH ROW EXECUTE FUNCTION substations_set_geom();

CREATE INDEX idx_substations_geom ON substations USING GIST(geom);
CREATE INDEX idx_substations_state ON substations(state);
CREATE INDEX idx_substations_available_mw ON substations(available_mw);
