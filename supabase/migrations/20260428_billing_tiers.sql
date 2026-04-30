-- Billing tier feature gating: ensure organizations table carries the active
-- plan tier and the trial cutoff date. trial_ends_at may already exist from
-- 20260424_onboarding.sql; the IF NOT EXISTS guards make this re-runnable.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'trial';

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days');

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_organizations_plan_tier ON organizations(plan_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);

-- Constrain to known tiers. Drop-and-recreate so re-running the migration is safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_plan_tier_check'
  ) THEN
    ALTER TABLE organizations DROP CONSTRAINT organizations_plan_tier_check;
  END IF;
END $$;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_plan_tier_check
  CHECK (plan_tier IN ('trial', 'starter', 'growth', 'enterprise'));

-- subscriptions table: ensure tier column matches the org plan_tier shape.
-- Skip if subscriptions table doesn't exist (Stripe billing not yet enabled).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'subscriptions'
  ) THEN
    EXECUTE 'ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tier text';
  END IF;
END $$;

-- Backfill from existing 'plan' column if present, mapping legacy tiers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'plan'
  ) THEN
    UPDATE subscriptions
       SET tier = CASE
         WHEN plan = 'pro' THEN 'growth'
         WHEN plan = 'enterprise' THEN 'enterprise'
         WHEN plan = 'explorer' THEN 'trial'
         WHEN plan IN ('trial', 'starter', 'growth') THEN plan
         ELSE 'trial'
       END
     WHERE tier IS NULL;
  END IF;
END $$;
