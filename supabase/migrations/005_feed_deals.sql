-- ============================================================================
-- Migration 005: Feed Deals, Buy Boxes, Wholesale Submissions
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ── 1. feed_deals ───────────────────────────────────────────────────────────
-- Curated deal listings from various sources (MLS, wholesalers, off-market)
CREATE TABLE IF NOT EXISTS feed_deals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  address       TEXT NOT NULL,
  city          TEXT,
  state         TEXT,
  zip           TEXT,
  property_type TEXT,
  bedrooms      INTEGER,
  bathrooms     NUMERIC(3,1),
  sqft          INTEGER,
  lot_size      NUMERIC(10,2),
  year_built    INTEGER,
  asking_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  arv           NUMERIC(12,2),
  rehab_cost    NUMERIC(12,2),
  cap_rate_estimate NUMERIC(5,2),
  ai_score      NUMERIC(3,1),
  source        TEXT,               -- 'mls', 'wholesaler', 'off_market', 'auction'
  source_url    TEXT,
  contact_name  TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes         TEXT,
  status        TEXT DEFAULT 'active',  -- 'active', 'under_contract', 'sold', 'expired'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_deals_user    ON feed_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_deals_city    ON feed_deals(city, state);
CREATE INDEX IF NOT EXISTS idx_feed_deals_price   ON feed_deals(asking_price);
CREATE INDEX IF NOT EXISTS idx_feed_deals_created ON feed_deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_deals_source  ON feed_deals(source);

-- RLS
ALTER TABLE feed_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all feed deals"
  ON feed_deals FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own feed deals"
  ON feed_deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feed deals"
  ON feed_deals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own feed deals"
  ON feed_deals FOR DELETE
  USING (auth.uid() = user_id);


-- ── 2. wholesale_submissions ────────────────────────────────────────────────
-- Deals submitted by wholesalers for marketplace listing
CREATE TABLE IF NOT EXISTS wholesale_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  submitter_name  TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_phone TEXT,
  address         TEXT NOT NULL,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  property_type   TEXT,
  bedrooms        INTEGER,
  bathrooms       NUMERIC(3,1),
  sqft            INTEGER,
  year_built      INTEGER,
  asking_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  arv             NUMERIC(12,2),
  rehab_estimate  NUMERIC(12,2),
  description     TEXT,
  image_urls      TEXT[],
  status          TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'sold'
  views           INTEGER DEFAULT 0,
  saves           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wholesale_user    ON wholesale_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_status  ON wholesale_submissions(status);
CREATE INDEX IF NOT EXISTS idx_wholesale_created ON wholesale_submissions(created_at DESC);

-- RLS
ALTER TABLE wholesale_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approved submissions"
  ON wholesale_submissions FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON wholesale_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON wholesale_submissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own submissions"
  ON wholesale_submissions FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. buy_boxes ────────────────────────────────────────────────────────────
-- Investor matching criteria for automated deal alerts
CREATE TABLE IF NOT EXISTS buy_boxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL DEFAULT 'My Buy Box',
  markets         TEXT[],             -- e.g. ['phoenix, az', 'dallas, tx']
  property_types  TEXT[],             -- e.g. ['single_family', 'multifamily']
  price_min       NUMERIC(12,2),
  price_max       NUMERIC(12,2),
  min_bedrooms    INTEGER,
  min_bathrooms   NUMERIC(3,1),
  min_sqft        INTEGER,
  max_sqft        INTEGER,
  min_cap_rate    NUMERIC(5,2),
  min_cash_on_cash NUMERIC(5,2),
  max_rehab_cost  NUMERIC(12,2),
  strategies      TEXT[],             -- e.g. ['buy_and_hold', 'fix_and_flip', 'brrrr']
  notifications_enabled BOOLEAN DEFAULT true,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_buy_boxes_user   ON buy_boxes(user_id);
CREATE INDEX IF NOT EXISTS idx_buy_boxes_active ON buy_boxes(active);

-- RLS
ALTER TABLE buy_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own buy boxes"
  ON buy_boxes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own buy boxes"
  ON buy_boxes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buy boxes"
  ON buy_boxes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own buy boxes"
  ON buy_boxes FOR DELETE
  USING (auth.uid() = user_id);
