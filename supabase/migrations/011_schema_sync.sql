-- ============================================================
-- 011_schema_sync.sql
-- Adds missing columns that the application code expects.
-- All columns use IF NOT EXISTS to be safe for re-runs.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. properties — add monthly_rent and other missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_rent          NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_expenses      NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vacancy_rate          NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_url             TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS name                  TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS county                TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_size              NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude              DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude             DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS taxes_monthly         NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS insurance_monthly     NUMERIC;

-- ---------------------------------------------------------------------------
-- 2. deals — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title           TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS close_date      DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS priority        TEXT DEFAULT 'medium';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS agent_name      TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS agent_phone     TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS agent_email     TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS repair_cost     NUMERIC;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS image_url       TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage           TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS analysis        JSONB;

-- ---------------------------------------------------------------------------
-- 3. agent_logs — add 'action' alias column
-- ---------------------------------------------------------------------------
ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS action TEXT;

-- ---------------------------------------------------------------------------
-- 4. transactions — add recurring columns
-- ---------------------------------------------------------------------------
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring            BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_frequency  TEXT;

-- ---------------------------------------------------------------------------
-- 5. tenants — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name              TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS unit              TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS screening_status  TEXT DEFAULT 'not_started';

-- ---------------------------------------------------------------------------
-- 6. ai_conversations — add missing columns
-- ---------------------------------------------------------------------------
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS agent_type TEXT;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS pinned     BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 7. feed_deals — add saves counter
-- ---------------------------------------------------------------------------
ALTER TABLE feed_deals ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 8. profiles — add missing settings columns
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_sharing_enabled      BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_voice                       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS escalation_email_on_no_answer  BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS escalation_to_human            BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cc_landlord                    BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_calls_per_day              INTEGER DEFAULT 10;
