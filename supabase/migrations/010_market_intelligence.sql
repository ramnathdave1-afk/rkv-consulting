-- Market Intelligence (collected by Agent Delta)
CREATE TABLE market_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region TEXT NOT NULL,
  state TEXT NOT NULL,
  avg_power_cost_kwh DOUBLE PRECISION,
  avg_land_cost_acre DOUBLE PRECISION,
  tax_incentive_score INTEGER CHECK (tax_incentive_score >= 0 AND tax_incentive_score <= 100),
  fiber_density_score INTEGER CHECK (fiber_density_score >= 0 AND fiber_density_score <= 100),
  data JSONB,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_intel_state ON market_intelligence(state);
CREATE INDEX idx_market_intel_region ON market_intelligence(region);
