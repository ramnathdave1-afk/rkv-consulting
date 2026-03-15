-- Scoring Profiles — configurable scoring dimensions per vertical
-- Replaces hardcoded WEIGHTS in agent gamma.

CREATE TABLE scoring_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  vertical TEXT NOT NULL,
  dimensions JSONB NOT NULL,           -- array of { key, label, weight, color }
  is_default BOOLEAN DEFAULT FALSE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scoring_profiles_vertical ON scoring_profiles(vertical);
CREATE INDEX idx_scoring_profiles_org ON scoring_profiles(org_id);
CREATE UNIQUE INDEX idx_scoring_profiles_default ON scoring_profiles(vertical, org_id) WHERE is_default = TRUE;

-- Seed default profiles for each vertical
INSERT INTO scoring_profiles (name, vertical, dimensions, is_default) VALUES
  ('Data Center Standard', 'data_center', '[
    {"key":"grid","label":"Grid Access","weight":0.30,"color":"#00D4AA"},
    {"key":"land","label":"Land Suitability","weight":0.20,"color":"#3B82F6"},
    {"key":"risk","label":"Risk Assessment","weight":0.15,"color":"#F59E0B"},
    {"key":"market","label":"Market Conditions","weight":0.15,"color":"#8B5CF6"},
    {"key":"connectivity","label":"Connectivity","weight":0.20,"color":"#EC4899"}
  ]'::JSONB, TRUE),

  ('Solar Standard', 'solar', '[
    {"key":"irradiance","label":"Solar Irradiance","weight":0.25,"color":"#F59E0B"},
    {"key":"grid","label":"Grid Access","weight":0.25,"color":"#00D4AA"},
    {"key":"land","label":"Land Suitability","weight":0.20,"color":"#3B82F6"},
    {"key":"terrain","label":"Terrain & Slope","weight":0.15,"color":"#8B5CF6"},
    {"key":"risk","label":"Risk Assessment","weight":0.15,"color":"#EC4899"}
  ]'::JSONB, TRUE),

  ('Wind Standard', 'wind', '[
    {"key":"wind_speed","label":"Wind Resource","weight":0.30,"color":"#06B6D4"},
    {"key":"grid","label":"Grid Access","weight":0.20,"color":"#00D4AA"},
    {"key":"land","label":"Land Suitability","weight":0.20,"color":"#3B82F6"},
    {"key":"setbacks","label":"Setback Compliance","weight":0.15,"color":"#F59E0B"},
    {"key":"risk","label":"Risk Assessment","weight":0.15,"color":"#EC4899"}
  ]'::JSONB, TRUE),

  ('EV Charging Standard', 'ev_charging', '[
    {"key":"traffic","label":"Traffic Density","weight":0.30,"color":"#10B981"},
    {"key":"grid","label":"Grid Access","weight":0.25,"color":"#00D4AA"},
    {"key":"visibility","label":"Site Visibility","weight":0.20,"color":"#F59E0B"},
    {"key":"competition","label":"Competition Gap","weight":0.15,"color":"#EF4444"},
    {"key":"market","label":"Market Demand","weight":0.10,"color":"#8B5CF6"}
  ]'::JSONB, TRUE),

  ('Industrial Standard', 'industrial', '[
    {"key":"grid","label":"Power Access","weight":0.25,"color":"#00D4AA"},
    {"key":"land","label":"Land & Zoning","weight":0.25,"color":"#3B82F6"},
    {"key":"logistics","label":"Logistics Access","weight":0.20,"color":"#F59E0B"},
    {"key":"labor","label":"Labor Market","weight":0.15,"color":"#8B5CF6"},
    {"key":"risk","label":"Risk Assessment","weight":0.15,"color":"#EC4899"}
  ]'::JSONB, TRUE),

  ('Residential Standard', 'residential', '[
    {"key":"land","label":"Land & Zoning","weight":0.25,"color":"#3B82F6"},
    {"key":"market","label":"Housing Demand","weight":0.25,"color":"#00D4AA"},
    {"key":"infrastructure","label":"Utilities & Roads","weight":0.20,"color":"#F59E0B"},
    {"key":"schools","label":"School District","weight":0.15,"color":"#8B5CF6"},
    {"key":"risk","label":"Risk Assessment","weight":0.15,"color":"#EC4899"}
  ]'::JSONB, TRUE),

  ('Mixed Use Standard', 'mixed_use', '[
    {"key":"land","label":"Land & Zoning","weight":0.20,"color":"#3B82F6"},
    {"key":"market","label":"Market Demand","weight":0.20,"color":"#00D4AA"},
    {"key":"infrastructure","label":"Infrastructure","weight":0.20,"color":"#F59E0B"},
    {"key":"walkability","label":"Walkability","weight":0.20,"color":"#8B5CF6"},
    {"key":"risk","label":"Risk Assessment","weight":0.20,"color":"#EC4899"}
  ]'::JSONB, TRUE);

-- RLS
ALTER TABLE scoring_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read scoring_profiles"
  ON scoring_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write scoring_profiles"
  ON scoring_profiles FOR ALL
  USING (auth.role() = 'service_role');
