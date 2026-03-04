-- ============================================================================
-- Deal Stage History — Track stage transitions for pipeline analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_deal ON deal_stage_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_stage_history_user ON deal_stage_history(user_id);

-- RLS
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deal stage history"
  ON deal_stage_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Backfill existing deals with their current stage
INSERT INTO deal_stage_history (deal_id, user_id, from_stage, to_stage, entered_at)
SELECT
  d.id,
  d.user_id,
  NULL,
  COALESCE(d.status, 'lead'),
  COALESCE(d.stage_entered_at, d.created_at)
FROM deals d
WHERE NOT EXISTS (
  SELECT 1 FROM deal_stage_history h WHERE h.deal_id = d.id
);
