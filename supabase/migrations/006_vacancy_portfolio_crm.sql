-- ============================================================================
-- Migration 006: Vacancy Inquiries, Portfolio Snapshots
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Vacancy Inquiries (for Vacancies page)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacancy_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  prospect_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'Direct', -- Zillow, Facebook, Direct, Apartments.com, Craigslist
  interest_score TEXT NOT NULL DEFAULT 'Medium' CHECK (interest_score IN ('High', 'Medium', 'Low')),
  date_received TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vacancy_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vacancy_inquiries"
  ON vacancy_inquiries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_vacancy_inquiries_user ON vacancy_inquiries(user_id);
CREATE INDEX idx_vacancy_inquiries_property ON vacancy_inquiries(property_id);
CREATE INDEX idx_vacancy_inquiries_date ON vacancy_inquiries(date_received DESC);

-- ---------------------------------------------------------------------------
-- 2. Vacancy Showings (optional)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacancy_showings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  prospect_name TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Confirmed', 'Pending', 'Completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vacancy_showings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vacancy_showings"
  ON vacancy_showings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_vacancy_showings_user ON vacancy_showings(user_id);
CREATE INDEX idx_vacancy_showings_property ON vacancy_showings(property_id);

-- ---------------------------------------------------------------------------
-- 3. Portfolio Snapshots (for dashboard sparklines)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  portfolio_value NUMERIC NOT NULL DEFAULT 0,
  equity NUMERIC NOT NULL DEFAULT 0,
  monthly_cash_flow NUMERIC NOT NULL DEFAULT 0,
  net_roi NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio_snapshots"
  ON portfolio_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);
