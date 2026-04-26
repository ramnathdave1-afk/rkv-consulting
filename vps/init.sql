-- =============================================================
-- RKV Consulting — Outreach System v2 Schema
-- 15 tables, self-hosted PostgreSQL on Hostinger VPS
-- No Supabase dependencies
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- Prerequisite: organizations
-- =============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 1. outreach_leads (companies scraped)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID,
  company_name TEXT NOT NULL,
  industry TEXT DEFAULT 'property_management',
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  unit_count INT,
  employee_count INT,
  google_rating NUMERIC(2,1),
  review_count INT DEFAULT 0,
  website_score INT DEFAULT 0,
  tech_stack TEXT[] DEFAULT '{}',
  pain_signals JSONB DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  office_locations INT DEFAULT 1,
  year_founded INT,
  has_ai_tools BOOLEAN DEFAULT false,
  source TEXT CHECK (source IN ('google_maps','linkedin','facebook','directory','manual','import')),
  source_url TEXT,
  icp_score NUMERIC(5,2) DEFAULT 0,
  icp_score_reason TEXT,
  status TEXT NOT NULL DEFAULT 'raw'
    CHECK (status IN ('raw','enriched','qualified','contacted','replied','meeting_booked','proposal_sent','closed_won','closed_lost','archived','disqualified')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. outreach_contacts (decision-makers, 2-3 per lead)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES outreach_leads(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  email_status TEXT DEFAULT 'unknown'
    CHECK (email_status IN ('unknown','valid','invalid','risky','catch_all')),
  email_verified_at TIMESTAMPTZ,
  linkedin_url TEXT,
  phone TEXT,
  role_type TEXT CHECK (role_type IN ('ceo','vp_ops','regional_manager','property_manager','other')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','verified','contacted','replied','interested','meeting_booked','not_interested','unsubscribed','wrong_person')),
  sequence_step INT DEFAULT 0,
  next_step_date TIMESTAMPTZ,
  next_step_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. outreach_research_reports (Sonnet dossiers per lead)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_research_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES outreach_leads(id) ON DELETE CASCADE,
  report_json JSONB NOT NULL DEFAULT '{}',
  report_summary TEXT,
  company_overview TEXT,
  portfolio_analysis TEXT,
  tech_stack_assessment TEXT,
  pain_point_assessment TEXT,
  review_analysis TEXT,
  competitive_landscape TEXT,
  pitch_strategy TEXT,
  primary_hook TEXT,
  secondary_hook TEXT,
  best_contact_id UUID REFERENCES outreach_contacts(id),
  generated_by TEXT DEFAULT 'sonnet',
  tokens_used INT DEFAULT 0,
  cost_usd NUMERIC(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 4. outreach_campaigns
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry_target TEXT DEFAULT 'property_management',
  geo_target TEXT,
  target_count INT DEFAULT 5000,
  icp_criteria JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scraping','enriching','scoring','writing','queued','sending','active','paused','completed')),
  total_leads INT DEFAULT 0,
  qualified_leads INT DEFAULT 0,
  contacted INT DEFAULT 0,
  replied INT DEFAULT 0,
  interested INT DEFAULT 0,
  meetings_booked INT DEFAULT 0,
  deals_won INT DEFAULT 0,
  daily_send_limit INT DEFAULT 425,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK now that campaigns table exists
ALTER TABLE outreach_leads
  ADD CONSTRAINT fk_leads_campaign
  FOREIGN KEY (campaign_id) REFERENCES outreach_campaigns(id) ON DELETE SET NULL;

-- =============================================================
-- 5. outreach_sends (every email sent)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES outreach_campaigns(id),
  contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES outreach_leads(id),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms')),
  subject TEXT,
  subject_variant TEXT CHECK (subject_variant IN ('A','B','C')),
  body TEXT,
  sequence_step INT DEFAULT 1,
  sending_account TEXT,
  message_id TEXT,
  thread_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sending','sent','delivered','opened','clicked','replied','bounced','spam','failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 6. outreach_replies (inbound replies)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  send_id UUID REFERENCES outreach_sends(id),
  contact_id UUID REFERENCES outreach_contacts(id),
  lead_id UUID REFERENCES outreach_leads(id),
  from_email TEXT,
  subject TEXT,
  body TEXT,
  classification TEXT CHECK (classification IN (
    'interested','objection','question','not_interested',
    'unsubscribe','out_of_office','wrong_person','referral'
  )),
  sentiment_score NUMERIC(3,2),
  objection_type TEXT,
  referred_to_name TEXT,
  referred_to_email TEXT,
  auto_response_sent BOOLEAN DEFAULT false,
  auto_response_text TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 7. outreach_sequences (follow-up tracking per contact)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES outreach_campaigns(id),
  contact_id UUID NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES outreach_leads(id),
  current_step INT DEFAULT 1,
  max_steps INT DEFAULT 5,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','replied','stopped')),
  stopped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 8. outreach_domains (17 Gmail sending accounts)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT,
  daily_limit INT DEFAULT 5,
  current_daily_count INT DEFAULT 0,
  warmup_day INT DEFAULT 0,
  warmup_stage TEXT DEFAULT 'week1'
    CHECK (warmup_stage IN ('week1','week2','week3','week4','week5','ready')),
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  reputation_score NUMERIC(3,2) DEFAULT 1.0,
  oauth_credentials JSONB,
  status TEXT NOT NULL DEFAULT 'warming'
    CHECK (status IN ('active','warming','paused','blacklisted')),
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 9. outreach_suppression (global do-not-email)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_suppression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, email)
);

-- =============================================================
-- 10. outreach_meetings
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id),
  lead_id UUID REFERENCES outreach_leads(id),
  campaign_id UUID REFERENCES outreach_campaigns(id),
  calendar_event_id TEXT,
  google_meet_link TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  outcome TEXT CHECK (outcome IN ('send_proposal','follow_up_later','not_interested','closed_won')),
  briefing_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 11. outreach_deals (pipeline)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id),
  lead_id UUID REFERENCES outreach_leads(id),
  campaign_id UUID REFERENCES outreach_campaigns(id),
  meeting_id UUID REFERENCES outreach_meetings(id),
  stage TEXT NOT NULL DEFAULT 'meeting_scheduled'
    CHECK (stage IN ('meeting_scheduled','proposal_sent','negotiation','closed_won','closed_lost','nurture')),
  value_monthly NUMERIC(10,2),
  units INT,
  proposal_content TEXT,
  notes TEXT,
  lost_reason TEXT,
  closed_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  followup_step INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 12. outreach_agent_status (live status per agent)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  agent_number INT,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle','running','error','disabled')),
  current_action TEXT,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  total_runs INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  runs_today INT DEFAULT 0,
  tokens_today INT DEFAULT 0,
  cost_today NUMERIC(10,4) DEFAULT 0,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, agent_name)
);

-- =============================================================
-- 13. outreach_agent_runs (execution log)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  campaign_id UUID REFERENCES outreach_campaigns(id),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','failed','cancelled')),
  input_summary TEXT,
  output_summary TEXT,
  tokens_used INT DEFAULT 0,
  cost_usd NUMERIC(8,6) DEFAULT 0,
  duration_ms INT,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =============================================================
-- 14. outreach_system_log (system terminal entries)
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_system_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT,
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info','warning','error','success')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- 15. outreach_weekly_reports
-- =============================================================
CREATE TABLE IF NOT EXISTS outreach_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  emails_sent INT DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  meetings_booked INT DEFAULT 0,
  pipeline_value NUMERIC(10,2) DEFAULT 0,
  cost_total NUMERIC(10,4) DEFAULT 0,
  report_data JSONB DEFAULT '{}',
  ai_analysis TEXT,
  recommendations JSONB DEFAULT '[]',
  auto_adjustments JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- Indexes
-- =============================================================

-- org_id indexes
CREATE INDEX IF NOT EXISTS idx_leads_org ON outreach_leads(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON outreach_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_research_org ON outreach_research_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON outreach_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_sends_org ON outreach_sends(org_id);
CREATE INDEX IF NOT EXISTS idx_replies_org ON outreach_replies(org_id);
CREATE INDEX IF NOT EXISTS idx_sequences_org ON outreach_sequences(org_id);
CREATE INDEX IF NOT EXISTS idx_domains_org ON outreach_domains(org_id);
CREATE INDEX IF NOT EXISTS idx_suppression_org ON outreach_suppression(org_id);
CREATE INDEX IF NOT EXISTS idx_meetings_org ON outreach_meetings(org_id);
CREATE INDEX IF NOT EXISTS idx_deals_org ON outreach_deals(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_org ON outreach_agent_status(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_org ON outreach_agent_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_system_log_org ON outreach_system_log(org_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_org ON outreach_weekly_reports(org_id);

-- Targeted query indexes
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON outreach_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON outreach_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_icp ON outreach_leads(icp_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_state ON outreach_leads(state);
CREATE INDEX IF NOT EXISTS idx_contacts_lead ON outreach_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON outreach_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON outreach_contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_next_step ON outreach_contacts(next_step_date);
CREATE INDEX IF NOT EXISTS idx_research_lead ON outreach_research_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_sends_status ON outreach_sends(status);
CREATE INDEX IF NOT EXISTS idx_sends_contact ON outreach_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_sends_campaign ON outreach_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sends_thread ON outreach_sends(thread_id);
CREATE INDEX IF NOT EXISTS idx_replies_classification ON outreach_replies(classification);
CREATE INDEX IF NOT EXISTS idx_replies_contact ON outreach_replies(contact_id);
CREATE INDEX IF NOT EXISTS idx_sequences_contact ON outreach_sequences(contact_id);
CREATE INDEX IF NOT EXISTS idx_sequences_next ON outreach_sequences(next_send_at);
CREATE INDEX IF NOT EXISTS idx_sequences_status ON outreach_sequences(status);
CREATE INDEX IF NOT EXISTS idx_domains_email ON outreach_domains(email_address);
CREATE INDEX IF NOT EXISTS idx_domains_status ON outreach_domains(status);
CREATE INDEX IF NOT EXISTS idx_suppression_email ON outreach_suppression(email);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON outreach_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON outreach_deals(stage);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON outreach_agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_system_log_level ON outreach_system_log(level);
CREATE INDEX IF NOT EXISTS idx_system_log_created ON outreach_system_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON outreach_weekly_reports(week_start);


-- =============================================================
-- updated_at trigger
-- =============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON outreach_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON outreach_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_research_updated BEFORE UPDATE ON outreach_research_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON outreach_campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sequences_updated BEFORE UPDATE ON outreach_sequences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_domains_updated BEFORE UPDATE ON outreach_domains FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_meetings_updated BEFORE UPDATE ON outreach_meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON outreach_deals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_agent_status_updated BEFORE UPDATE ON outreach_agent_status FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================
-- Seed Data
-- =============================================================

-- Default organization
INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'RKV Consulting')
ON CONFLICT (id) DO NOTHING;

-- 15 agent status rows
INSERT INTO outreach_agent_status (org_id, agent_name, agent_number, status, config) VALUES
  ('00000000-0000-0000-0000-000000000001', 'lead_scraper', 1, 'idle', '{"model": "haiku", "apify": true}'),
  ('00000000-0000-0000-0000-000000000001', 'company_enricher', 2, 'idle', '{"model": "haiku", "apify": true}'),
  ('00000000-0000-0000-0000-000000000001', 'contact_finder', 3, 'idle', '{"model": "haiku", "apify": true}'),
  ('00000000-0000-0000-0000-000000000001', 'email_finder', 4, 'idle', '{"model": "haiku", "apify": true}'),
  ('00000000-0000-0000-0000-000000000001', 'email_verifier', 5, 'idle', '{"model": "none"}'),
  ('00000000-0000-0000-0000-000000000001', 'icp_scorer', 6, 'idle', '{"model": "haiku+sonnet", "sonnet_threshold": 0.9}'),
  ('00000000-0000-0000-0000-000000000001', 'research_report_generator', 7, 'idle', '{"model": "sonnet", "min_icp_score": 40}'),
  ('00000000-0000-0000-0000-000000000001', 'email_copywriter', 8, 'idle', '{"model": "sonnet+haiku", "sonnet_threshold": 0.8}'),
  ('00000000-0000-0000-0000-000000000001', 'subject_line_optimizer', 9, 'idle', '{"model": "haiku", "variants": 3}'),
  ('00000000-0000-0000-0000-000000000001', 'follow_up_sequencer', 10, 'idle', '{"model": "haiku", "max_steps": 5, "days": [3,6,9,12,14]}'),
  ('00000000-0000-0000-0000-000000000001', 'email_blaster', 11, 'idle', '{"model": "none", "batch_size": 50}'),
  ('00000000-0000-0000-0000-000000000001', 'reply_classifier', 12, 'idle', '{"model": "haiku"}'),
  ('00000000-0000-0000-0000-000000000001', 'lead_responder', 13, 'idle', '{"model": "sonnet", "max_response_time_sec": 120}'),
  ('00000000-0000-0000-0000-000000000001', 'meeting_booker', 14, 'idle', '{"model": "none"}'),
  ('00000000-0000-0000-0000-000000000001', 'campaign_orchestrator', 15, 'idle', '{"model": "sonnet"}')
ON CONFLICT (org_id, agent_name) DO NOTHING;
