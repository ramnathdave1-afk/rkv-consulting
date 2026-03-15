-- Data Ingestion Infrastructure
-- Tracks external data sources and their sync jobs.

-- ─── Data Sources Registry ─────────────────────────────────────────────────

CREATE TYPE data_source_type AS ENUM (
  'parcel',        -- Regrid, county assessor feeds
  'environmental', -- FEMA flood, NWI wetlands, EPA brownfields
  'energy',        -- EIA substations/plants, NREL solar/wind
  'infrastructure',-- OSM roads/fiber, Census demographics
  'market',        -- CoStar, ATTOM, custom feeds
  'zoning',        -- Municipal zoning shapefiles
  'permit'         -- County/city permit feeds
);

CREATE TYPE data_source_status AS ENUM (
  'active',     -- Scheduled and running
  'paused',     -- Temporarily disabled
  'error',      -- Last job failed
  'setup'       -- Initial configuration
);

CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  source_type data_source_type NOT NULL,
  provider TEXT NOT NULL,                          -- e.g. 'regrid', 'fema', 'eia'
  description TEXT,
  api_endpoint TEXT,
  api_key_env TEXT,                                -- env var name holding the API key
  auth_method TEXT DEFAULT 'api_key',              -- api_key, oauth, none
  status data_source_status NOT NULL DEFAULT 'setup',
  refresh_schedule TEXT,                           -- cron expression, e.g. '0 3 * * 0'
  coverage_states TEXT[],                          -- states covered, NULL = nationwide
  coverage_geojson JSONB,                          -- optional polygon bounding coverage
  config JSONB DEFAULT '{}',                       -- source-specific config (batch size, rate limits, etc.)
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_records INTEGER DEFAULT 0,
  total_records INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_sources_type ON data_sources(source_type);
CREATE INDEX idx_data_sources_status ON data_sources(status);
CREATE INDEX idx_data_sources_provider ON data_sources(provider);

-- ─── Ingestion Jobs ────────────────────────────────────────────────────────

CREATE TYPE ingestion_job_status AS ENUM (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  status ingestion_job_status NOT NULL DEFAULT 'queued',
  triggered_by TEXT NOT NULL DEFAULT 'schedule',   -- schedule, manual, agent
  -- Coverage for this particular job
  target_states TEXT[],
  target_counties TEXT[],
  target_bbox DOUBLE PRECISION[],                  -- [west, south, east, north]
  -- Progress tracking
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  records_errored INTEGER DEFAULT 0,
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  -- Diagnostics
  error_message TEXT,
  error_stack TEXT,
  warnings TEXT[],
  metadata JSONB DEFAULT '{}',                     -- connector-specific diagnostics
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_jobs_source ON ingestion_jobs(source_id);
CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX idx_ingestion_jobs_created ON ingestion_jobs(created_at DESC);

-- ─── Update Trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_data_source_on_job_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed') AND OLD.status = 'running' THEN
    UPDATE data_sources SET
      last_sync_at = NEW.completed_at,
      last_sync_status = NEW.status::TEXT,
      last_sync_records = NEW.records_created + NEW.records_updated,
      total_records = total_records + NEW.records_created,
      status = CASE
        WHEN NEW.status = 'failed' THEN 'error'::data_source_status
        ELSE 'active'::data_source_status
      END,
      updated_at = now()
    WHERE id = NEW.source_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ingestion_job_complete
  AFTER UPDATE ON ingestion_jobs
  FOR EACH ROW EXECUTE FUNCTION update_data_source_on_job_complete();

-- ─── Seed Default Data Sources ─────────────────────────────────────────────

INSERT INTO data_sources (name, slug, source_type, provider, description, api_endpoint, api_key_env, auth_method, status, refresh_schedule, config) VALUES
  ('EIA Substations & Power Plants', 'eia-energy', 'energy', 'eia',
   'US Energy Information Administration — substations, power plants, transmission lines',
   'https://api.eia.gov/v2', 'EIA_API_KEY', 'api_key', 'setup', '0 2 * * 0',
   '{"batch_size": 5000, "endpoints": ["electricity/operating-generator-capacity"]}'::JSONB),

  ('FEMA Flood Zones (NFHL)', 'fema-flood', 'environmental', 'fema',
   'FEMA National Flood Hazard Layer — flood zone designations',
   'https://hazards.fema.gov/gis/nfhl/rest/services', NULL, 'none', 'setup', '0 3 1 * *',
   '{"format": "geojson", "layer": "S_FLD_HAZ_AR"}'::JSONB),

  ('NREL Solar & Wind Resources', 'nrel-resources', 'energy', 'nrel',
   'NREL solar irradiance (GHI/DNI) and wind speed data',
   'https://developer.nrel.gov/api', 'NREL_API_KEY', 'api_key', 'setup', '0 4 1 * *',
   '{"datasets": ["solar/solar_resource_v1", "wind/wind_resource_v1"]}'::JSONB),

  ('Census / ACS Demographics', 'census-acs', 'infrastructure', 'census',
   'US Census Bureau — population density, income, housing',
   'https://api.census.gov/data', 'CENSUS_API_KEY', 'api_key', 'setup', '0 5 1 1 *',
   '{"dataset": "acs/acs5", "year": 2023}'::JSONB),

  ('OpenStreetMap Infrastructure', 'osm-infra', 'infrastructure', 'osm',
   'Roads, fiber routes, rail lines via Overpass API',
   'https://overpass-api.de/api/interpreter', NULL, 'none', 'setup', '0 1 * * 0',
   '{"timeout": 60, "maxsize": 536870912}'::JSONB),

  ('Regrid Parcel Data', 'regrid-parcels', 'parcel', 'regrid',
   'Nationwide parcel boundaries, ownership, assessments',
   'https://app.regrid.com/api/v2', 'REGRID_API_KEY', 'api_key', 'setup', '0 0 * * 0',
   '{"batch_size": 1000, "fields": ["apn","owner","address","acreage","zoning","assessed_value","market_value","boundary"]}'::JSONB);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- Service role only (worker process)
CREATE POLICY "Service role full access on data_sources"
  ON data_sources FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on ingestion_jobs"
  ON ingestion_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can read
CREATE POLICY "Authenticated users can read data_sources"
  ON data_sources FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read ingestion_jobs"
  ON ingestion_jobs FOR SELECT
  USING (auth.role() = 'authenticated');
