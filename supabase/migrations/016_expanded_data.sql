-- Expanded Data Tables
-- Rich parcel data, zoning districts, permits, and environmental layers.

-- ─── Expand Parcels ────────────────────────────────────────────────────────

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS fips_code TEXT,
  ADD COLUMN IF NOT EXISTS assessed_value DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS market_value DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS tax_amount DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS tax_year INTEGER,
  ADD COLUMN IF NOT EXISTS lot_size_sqft DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS land_use_code TEXT,
  ADD COLUMN IF NOT EXISTS land_use_desc TEXT,
  ADD COLUMN IF NOT EXISTS flood_zone TEXT,
  ADD COLUMN IF NOT EXISTS flood_zone_type TEXT,
  ADD COLUMN IF NOT EXISTS wetland_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS environmental_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS utilities_available JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS topography JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS soil_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_data JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_parcels_fips ON parcels(fips_code);
CREATE INDEX IF NOT EXISTS idx_parcels_county ON parcels(county);
CREATE INDEX IF NOT EXISTS idx_parcels_zoning ON parcels(zoning);
CREATE INDEX IF NOT EXISTS idx_parcels_apn ON parcels(apn);
CREATE INDEX IF NOT EXISTS idx_parcels_flood ON parcels(flood_zone);
CREATE INDEX IF NOT EXISTS idx_parcels_land_use ON parcels(land_use_code);
CREATE INDEX IF NOT EXISTS idx_parcels_assessed_value ON parcels(assessed_value);
CREATE INDEX IF NOT EXISTS idx_parcels_boundary ON parcels USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_parcels_source ON parcels(source_id);

-- Composite index for common filter combos
CREATE INDEX IF NOT EXISTS idx_parcels_state_county_acreage
  ON parcels(state, county, acreage);

-- ─── Zoning Districts ──────────────────────────────────────────────────────

CREATE TABLE zoning_districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction TEXT NOT NULL,                      -- City or county name
  state TEXT NOT NULL,
  county TEXT,
  zone_code TEXT NOT NULL,                         -- e.g. 'M-1', 'C-2', 'R-3'
  zone_name TEXT,                                  -- e.g. 'Light Industrial'
  zone_category TEXT,                              -- residential, commercial, industrial, agricultural, mixed_use, special
  permitted_uses TEXT[],
  conditional_uses TEXT[],
  prohibited_uses TEXT[],
  max_building_height_ft DOUBLE PRECISION,
  max_lot_coverage_pct DOUBLE PRECISION,
  min_lot_size_sqft DOUBLE PRECISION,
  front_setback_ft DOUBLE PRECISION,
  side_setback_ft DOUBLE PRECISION,
  rear_setback_ft DOUBLE PRECISION,
  max_far DOUBLE PRECISION,                        -- floor area ratio
  parking_requirements JSONB,
  special_conditions TEXT,
  overlay_district TEXT,
  boundary GEOMETRY(MultiPolygon, 4326),
  source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zoning_jurisdiction ON zoning_districts(jurisdiction);
CREATE INDEX idx_zoning_state ON zoning_districts(state);
CREATE INDEX idx_zoning_code ON zoning_districts(zone_code);
CREATE INDEX idx_zoning_category ON zoning_districts(zone_category);
CREATE INDEX idx_zoning_boundary ON zoning_districts USING GIST(boundary);

-- ─── Permits ────────────────────────────────────────────────────────────────

CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  permit_number TEXT NOT NULL,
  permit_type TEXT NOT NULL,                       -- building, grading, electrical, demolition, special_use
  status TEXT NOT NULL,                            -- submitted, under_review, approved, denied, expired
  applicant TEXT,
  applicant_type TEXT,                             -- individual, company, government
  description TEXT,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  address TEXT,
  state TEXT NOT NULL,
  county TEXT,
  jurisdiction TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geom GEOMETRY(Point, 4326),
  submitted_date DATE,
  issued_date DATE,
  expiration_date DATE,
  estimated_value DOUBLE PRECISION,
  actual_cost DOUBLE PRECISION,
  square_footage DOUBLE PRECISION,
  stories INTEGER,
  units INTEGER,
  contractor TEXT,
  inspection_status TEXT,
  conditions TEXT[],
  source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-set geom from lat/lng
CREATE OR REPLACE FUNCTION permits_set_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER permits_geom_trigger
  BEFORE INSERT OR UPDATE ON permits
  FOR EACH ROW EXECUTE FUNCTION permits_set_geom();

CREATE INDEX idx_permits_number ON permits(permit_number);
CREATE INDEX idx_permits_type ON permits(permit_type);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_parcel ON permits(parcel_id);
CREATE INDEX idx_permits_jurisdiction ON permits(jurisdiction);
CREATE INDEX idx_permits_issued ON permits(issued_date);
CREATE INDEX idx_permits_geom ON permits USING GIST(geom);
CREATE INDEX idx_permits_state_county ON permits(state, county);

-- ─── Environmental Layers ───────────────────────────────────────────────────

CREATE TABLE environmental_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  layer_type TEXT NOT NULL,                        -- flood_zone, wetland, contaminated, protected, critical_habitat, erosion
  severity TEXT,                                   -- high, moderate, low, minimal
  designation TEXT,                                -- e.g. 'AE', 'VE', 'X' for FEMA; 'PFO1A' for NWI
  name TEXT,                                       -- e.g. 'Sonoran Desert National Monument'
  description TEXT,
  state TEXT,
  county TEXT,
  source_agency TEXT,                              -- FEMA, EPA, USFWS, USACE
  effective_date DATE,
  expiration_date DATE,
  boundary GEOMETRY(MultiPolygon, 4326),
  centroid GEOMETRY(Point, 4326),
  area_acres DOUBLE PRECISION,
  restrictions JSONB DEFAULT '{}',                 -- what you can/can't build
  mitigation_required BOOLEAN DEFAULT FALSE,
  mitigation_details TEXT,
  source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_envlayers_type ON environmental_layers(layer_type);
CREATE INDEX idx_envlayers_severity ON environmental_layers(severity);
CREATE INDEX idx_envlayers_state ON environmental_layers(state);
CREATE INDEX idx_envlayers_boundary ON environmental_layers USING GIST(boundary);
CREATE INDEX idx_envlayers_centroid ON environmental_layers USING GIST(centroid);

-- ─── Spatial Lookup Functions ───────────────────────────────────────────────

-- Find parcels within a bounding box
CREATE OR REPLACE FUNCTION find_parcels_in_bbox(
  west DOUBLE PRECISION,
  south DOUBLE PRECISION,
  east DOUBLE PRECISION,
  north DOUBLE PRECISION,
  lim INTEGER DEFAULT 500
)
RETURNS SETOF parcels AS $$
  SELECT * FROM parcels
  WHERE geom && ST_MakeEnvelope(west, south, east, north, 4326)
  ORDER BY acreage DESC NULLS LAST
  LIMIT lim;
$$ LANGUAGE sql STABLE;

-- Find environmental constraints for a parcel
CREATE OR REPLACE FUNCTION find_environmental_constraints(
  parcel_geom GEOMETRY
)
RETURNS TABLE(
  layer_type TEXT,
  severity TEXT,
  designation TEXT,
  source_agency TEXT,
  restrictions JSONB
) AS $$
  SELECT
    el.layer_type,
    el.severity,
    el.designation,
    el.source_agency,
    el.restrictions
  FROM environmental_layers el
  WHERE ST_Intersects(el.boundary, parcel_geom);
$$ LANGUAGE sql STABLE;

-- Find zoning for a point
CREATE OR REPLACE FUNCTION find_zoning_at_point(
  point_lng DOUBLE PRECISION,
  point_lat DOUBLE PRECISION
)
RETURNS SETOF zoning_districts AS $$
  SELECT * FROM zoning_districts
  WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326))
  LIMIT 5;
$$ LANGUAGE sql STABLE;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE zoning_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_layers ENABLE ROW LEVEL SECURITY;

-- Public data — anyone authenticated can read
CREATE POLICY "Authenticated read zoning_districts"
  ON zoning_districts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read permits"
  ON permits FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read environmental_layers"
  ON environmental_layers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can write (ingestion workers)
CREATE POLICY "Service role write zoning_districts"
  ON zoning_districts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role write permits"
  ON permits FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role write environmental_layers"
  ON environmental_layers FOR ALL
  USING (auth.role() = 'service_role');
