-- =============================================================
-- 027: Activity Feed — Real-time platform-wide event stream
-- =============================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'call_inbound', 'call_outbound', 'sms_inbound', 'sms_outbound',
      'maintenance_created', 'maintenance_updated',
      'rent_payment', 'lease_expiring', 'lease_renewal_sent',
      'showing_scheduled', 'showing_completed',
      'work_order_assigned', 'work_order_completed',
      'collection_action', 'move_in_created',
      'campaign_sent', 'deal_stage_change',
      'ai_conversation', 'tenant_created', 'property_added'
    )),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'success', 'warning', 'critical')),
  entity_type TEXT
    CHECK (entity_type IS NULL OR entity_type IN (
      'conversation', 'work_order', 'lease', 'tenant',
      'property', 'deal', 'campaign', 'showing', 'payment'
    )),
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_org ON activity_feed(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_unread ON activity_feed(org_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON activity_feed(entity_type, entity_id);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Org members view activity" ON activity_feed FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert activity" ON activity_feed FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update activity" ON activity_feed FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all activity" ON activity_feed FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable realtime for activity_feed
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
