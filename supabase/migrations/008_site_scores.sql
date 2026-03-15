-- Site Scores (composite + 5 sub-scores, 0-100)
CREATE TABLE site_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES ghost_sites(id) ON DELETE CASCADE,
  composite_score INTEGER NOT NULL CHECK (composite_score >= 0 AND composite_score <= 100),
  grid_score INTEGER NOT NULL DEFAULT 0 CHECK (grid_score >= 0 AND grid_score <= 100),
  land_score INTEGER NOT NULL DEFAULT 0 CHECK (land_score >= 0 AND land_score <= 100),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  market_score INTEGER NOT NULL DEFAULT 0 CHECK (market_score >= 0 AND market_score <= 100),
  connectivity_score INTEGER NOT NULL DEFAULT 0 CHECK (connectivity_score >= 0 AND connectivity_score <= 100),
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scored_by TEXT -- 'gamma' agent or user id
);

CREATE INDEX idx_site_scores_site_id ON site_scores(site_id);
CREATE INDEX idx_site_scores_composite ON site_scores(composite_score);
