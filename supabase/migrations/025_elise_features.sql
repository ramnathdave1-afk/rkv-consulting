-- =============================================================
-- 025: EliseAI Feature Parity — Campaigns, Lease Audits,
--      Move-Ins, Voice Campaigns, Delinquency Actions
-- =============================================================

-- ── 1. Campaigns ──
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'both')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled')),
  audience_filter JSONB DEFAULT '{}',
  message_subject TEXT,
  message_body TEXT NOT NULL DEFAULT '',
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view campaigns" ON campaigns FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert campaigns" ON campaigns FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update campaigns" ON campaigns FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all campaigns" ON campaigns FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Campaign Recipients ──
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient_name TEXT,
  recipient_contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_org ON campaign_recipients(org_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view campaign_recipients" ON campaign_recipients FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all campaign_recipients" ON campaign_recipients FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Lease Audits ──
CREATE TABLE IF NOT EXISTS lease_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  total_leases_scanned INT DEFAULT 0,
  issues_found INT DEFAULT 0,
  total_potential_revenue NUMERIC(12,2) DEFAULT 0,
  ai_summary TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_audits_org ON lease_audits(org_id);

ALTER TABLE lease_audits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view lease_audits" ON lease_audits FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert lease_audits" ON lease_audits FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all lease_audits" ON lease_audits FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Lease Audit Findings ──
CREATE TABLE IF NOT EXISTS lease_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES lease_audits(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  finding_type TEXT NOT NULL CHECK (finding_type IN ('below_market_rent', 'missing_late_fee', 'expired_lease_active', 'missing_security_deposit', 'terms_inconsistency')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description TEXT NOT NULL,
  current_value TEXT,
  recommended_value TEXT,
  potential_monthly_impact NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lease_audit_findings_audit ON lease_audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_lease_audit_findings_org ON lease_audit_findings(org_id);

ALTER TABLE lease_audit_findings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view lease_audit_findings" ON lease_audit_findings FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update lease_audit_findings" ON lease_audit_findings FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all lease_audit_findings" ON lease_audit_findings FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Move-In Checklists ──
CREATE TABLE IF NOT EXISTS move_in_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  move_in_date DATE,
  welcome_email_sent BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_in_checklists_org ON move_in_checklists(org_id);
CREATE INDEX IF NOT EXISTS idx_move_in_checklists_tenant ON move_in_checklists(tenant_id);

ALTER TABLE move_in_checklists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view move_in_checklists" ON move_in_checklists FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert move_in_checklists" ON move_in_checklists FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update move_in_checklists" ON move_in_checklists FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all move_in_checklists" ON move_in_checklists FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. Move-In Checklist Items ──
CREATE TABLE IF NOT EXISTS move_in_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES move_in_checklists(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('keys_issued', 'utilities_transferred', 'inspection_complete', 'welcome_packet_sent', 'emergency_contacts_collected', 'parking_assigned', 'mailbox_assigned', 'custom')),
  label TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_in_items_checklist ON move_in_checklist_items(checklist_id);

ALTER TABLE move_in_checklist_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view move_in_checklist_items" ON move_in_checklist_items FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update move_in_checklist_items" ON move_in_checklist_items FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all move_in_checklist_items" ON move_in_checklist_items FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 7. Voice Campaigns ──
CREATE TABLE IF NOT EXISTS voice_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('rent_reminder', 'maintenance_update', 'lease_renewal', 'showing_confirmation', 'custom')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'paused', 'failed')),
  total_calls INT DEFAULT 0,
  successful_calls INT DEFAULT 0,
  failed_calls INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_campaigns_org ON voice_campaigns(org_id);

ALTER TABLE voice_campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view voice_campaigns" ON voice_campaigns FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert voice_campaigns" ON voice_campaigns FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all voice_campaigns" ON voice_campaigns FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 8. Delinquency Actions ──
CREATE TABLE IF NOT EXISTS delinquency_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rent_payment_id UUID REFERENCES rent_payments(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('sms_reminder', 'voice_call', 'email', 'formal_notice')),
  tier TEXT NOT NULL CHECK (tier IN ('friendly', 'firm', 'final')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delinquency_actions_org ON delinquency_actions(org_id);
CREATE INDEX IF NOT EXISTS idx_delinquency_actions_tenant ON delinquency_actions(tenant_id);

ALTER TABLE delinquency_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view delinquency_actions" ON delinquency_actions FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all delinquency_actions" ON delinquency_actions FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
