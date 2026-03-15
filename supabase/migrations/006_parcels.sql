-- Parcels with boundary polygon
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apn TEXT,
  address TEXT,
  acreage DOUBLE PRECISION,
  zoning TEXT,
  owner TEXT,
  state TEXT NOT NULL,
  county TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOMETRY(Point, 4326),
  boundary GEOMETRY(Polygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION parcels_set_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcels_geom_trigger
  BEFORE INSERT OR UPDATE ON parcels
  FOR EACH ROW EXECUTE FUNCTION parcels_set_geom();

CREATE INDEX idx_parcels_geom ON parcels USING GIST(geom);
CREATE INDEX idx_parcels_acreage ON parcels(acreage);
CREATE INDEX idx_parcels_state ON parcels(state);
