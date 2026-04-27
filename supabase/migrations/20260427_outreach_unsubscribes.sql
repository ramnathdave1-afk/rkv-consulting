-- ═══════════════════════════════════════════════════════════════
-- Outreach Unsubscribes (CAN-SPAM suppression list)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outreach_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  email text NOT NULL,
  source text DEFAULT 'link', -- 'link', 'one-click', 'list-unsubscribe', 'reply', 'manual'
  unsubscribed_at timestamptz NOT NULL DEFAULT NOW(),
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS outreach_unsubscribes_org_email_uidx
  ON outreach_unsubscribes (org_id, lower(email));

CREATE INDEX IF NOT EXISTS outreach_unsubscribes_email_idx
  ON outreach_unsubscribes (lower(email));

ALTER TABLE outreach_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outreach_unsubscribes_org_isolation ON outreach_unsubscribes;
CREATE POLICY outreach_unsubscribes_org_isolation ON outreach_unsubscribes
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  );
