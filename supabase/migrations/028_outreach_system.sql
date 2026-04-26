-- =============================================================
-- 028: Outreach System — AI-powered sales outreach pipeline
-- =============================================================

-- -----------------------------------------------------------
-- 1. outreach_prospects
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  unit_count INT,
  employee_count INT,
  google_rating NUMERIC(2,1),
  review_count INT DEFAULT 0,
  has_chatbot BOOLEAN DEFAULT false,
  website_score INT DEFAULT 0,
  source TEXT CHECK (source IN ('google_maps','linkedin','facebook','manual','import')),
  source_url TEXT,
  icp_score NUMERIC(5,2) DEFAULT 0,
  icp_score_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','enriched','verified','contacted','replied','meeting_booked','closed_won','closed_lost','disqualified','cold','unsubscribed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 2. outreach_contacts
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  linkedin_url TEXT,
  phone TEXT,
  role_type TEXT CHECK (role_type IN ('ceo','vp_ops','regional_manager','property_manager','other')),
  personalization_hooks JSONB,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','verified','contacted','engaged','replied','interested','hot_lead','meeting_booked','not_interested','unsubscribed','cold','wrong_person')),
  heat_score INT DEFAULT 0,
  next_step_date TIMESTAMPTZ,
  next_step_type TEXT,
  sequence_step INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 3. outreach_campaigns
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry_target TEXT,
  geo_target TEXT,
  icp_criteria JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','prospecting','writing','emails_queued','sending','active','paused','completed')),
  total_prospects INT DEFAULT 0,
  qualified INT DEFAULT 0,
  contacted INT DEFAULT 0,
  replied INT DEFAULT 0,
  meetings_booked INT DEFAULT 0,
  daily_send_limit INT DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 4. outreach_sequences
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','linkedin_connect','linkedin_dm','sms','archive')),
  delay_days INT NOT NULL DEFAULT 0,
  subject_template TEXT,
  body_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 5. outreach_sends
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES outreach_campaigns(id),
  contact_id UUID REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','linkedin')),
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','queued_priority','sent','delivered','opened','clicked','replied','bounced','spam','failed')),
  subject_variant TEXT CHECK (subject_variant IN ('A','B','C')),
  sending_domain TEXT,
  message_id TEXT,
  thread_id TEXT,
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

-- -----------------------------------------------------------
-- 6. outreach_replies
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  send_id UUID REFERENCES outreach_sends(id),
  contact_id UUID REFERENCES outreach_contacts(id),
  from_email TEXT,
  subject TEXT,
  body TEXT,
  classification TEXT CHECK (classification IN ('interested','objection','question','not_interested','unsubscribe','out_of_office','wrong_person')),
  sentiment_score NUMERIC(3,2),
  buying_signals JSONB,
  objection_type TEXT,
  referred_to TEXT,
  auto_response TEXT,
  responded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 7. outreach_meetings
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id),
  campaign_id UUID REFERENCES outreach_campaigns(id),
  calendar_event_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  outcome TEXT CHECK (outcome IN ('send_proposal','follow_up_later','not_interested','closed_won')),
  notes TEXT,
  briefing_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 8. outreach_proposals
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id),
  meeting_id UUID REFERENCES outreach_meetings(id),
  content TEXT NOT NULL,
  pricing_monthly NUMERIC(10,2),
  estimated_roi_annual NUMERIC(10,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','accepted','rejected')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 9. outreach_deals
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id),
  prospect_id UUID REFERENCES outreach_prospects(id),
  campaign_id UUID REFERENCES outreach_campaigns(id),
  stage TEXT NOT NULL DEFAULT 'meeting_scheduled'
    CHECK (stage IN ('meeting_scheduled','proposal_sent','negotiation','closed_won','closed_lost','stale')),
  value_monthly NUMERIC(10,2),
  units INT,
  notes TEXT,
  lost_reason TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 10. outreach_domains
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT DEFAULT 'Dave from RKV Consulting',
  provider TEXT DEFAULT 'gmail' CHECK (provider IN ('gmail','resend','sendgrid')),
  daily_limit INT DEFAULT 20,
  current_daily_count INT DEFAULT 0,
  warmup_day INT DEFAULT 0,
  warmup_complete BOOLEAN DEFAULT false,
  reputation_score NUMERIC(3,2) DEFAULT 1.0,
  oauth_credentials JSONB,
  status TEXT NOT NULL DEFAULT 'warming'
    CHECK (status IN ('active','warming','paused','blacklisted')),
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 11. outreach_agent_runs
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','failed','cancelled')),
  input JSONB,
  output JSONB,
  tokens_used INT DEFAULT 0,
  cost_usd NUMERIC(8,6) DEFAULT 0,
  duration_ms INT,
  error_message TEXT,
  campaign_id UUID REFERENCES outreach_campaigns(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------
-- 12. outreach_agent_status
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle','running','error','disabled')),
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  total_runs INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, agent_name)
);

-- -----------------------------------------------------------
-- 13. outreach_trigger_events
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_trigger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('hiring_leasing','hiring_maintenance','bad_review','expansion','lost_property','linkedin_activity','competitor_price_change','lease_season')),
  detail TEXT,
  source_url TEXT,
  score INT DEFAULT 0,
  acted_on BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 14. outreach_social_touches
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_social_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id),
  touch_type TEXT NOT NULL
    CHECK (touch_type IN ('linkedin_follow','linkedin_like','linkedin_comment','linkedin_share','linkedin_connect','instagram_follow')),
  detail TEXT,
  apify_run_id TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('queued','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 15. outreach_linkedin_queue
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_linkedin_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES outreach_prospects(id),
  linkedin_url TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('connection_request','dm')),
  message_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','approved','sent','failed','rejected')),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  apify_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 16. outreach_intent_signals
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_intent_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  send_id UUID REFERENCES outreach_sends(id),
  signal_type TEXT NOT NULL
    CHECK (signal_type IN ('email_open','email_reopen','link_click','website_visit','pricing_page','demo_page','linkedin_view','email_forward')),
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 17. outreach_heat_scores
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_heat_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES outreach_contacts(id) ON DELETE CASCADE UNIQUE,
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  last_signal TEXT,
  last_signal_at TIMESTAMPTZ,
  signal_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 18. outreach_social_posts
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin','tiktok','facebook','instagram')),
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  caption TEXT,
  hashtags TEXT[],
  ad_budget_cents INT,
  post_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','posted','failed')),
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  engagement JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 19. outreach_optimization_log
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_optimization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  area TEXT NOT NULL
    CHECK (area IN ('subject_lines','email_copy','send_timing','icp_scoring','sequence_timing','social_warming','trigger_events','cost_efficiency')),
  finding TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  expected_impact TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 20. outreach_competitor_reports
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_competitor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  ads_data JSONB,
  pricing_changes JSONB,
  linkedin_activity JSONB,
  review_sentiment JSONB,
  gaps JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 21. outreach_voice_commands
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  raw_transcript TEXT NOT NULL,
  parsed_intent TEXT,
  parsed_params JSONB,
  result JSONB,
  status TEXT DEFAULT 'received'
    CHECK (status IN ('received','processing','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================
-- Indexes
-- =============================================================

-- org_id indexes for all tables
CREATE INDEX IF NOT EXISTS idx_outreach_prospects_org ON outreach_prospects(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_org ON outreach_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_org ON outreach_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sequences_org ON outreach_sequences(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sends_org ON outreach_sends(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_replies_org ON outreach_replies(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_meetings_org ON outreach_meetings(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_proposals_org ON outreach_proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_deals_org ON outreach_deals(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_domains_org ON outreach_domains(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_agent_runs_org ON outreach_agent_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_agent_status_org ON outreach_agent_status(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_trigger_events_org ON outreach_trigger_events(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_social_touches_org ON outreach_social_touches(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_linkedin_queue_org ON outreach_linkedin_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_intent_signals_org ON outreach_intent_signals(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_heat_scores_org ON outreach_heat_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_social_posts_org ON outreach_social_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_optimization_log_org ON outreach_optimization_log(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_competitor_reports_org ON outreach_competitor_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_outreach_voice_commands_org ON outreach_voice_commands(org_id);

-- Targeted indexes
CREATE INDEX IF NOT EXISTS idx_outreach_sends_status ON outreach_sends(status);
CREATE INDEX IF NOT EXISTS idx_outreach_sends_contact ON outreach_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_outreach_sends_campaign ON outreach_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_prospect ON outreach_contacts(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_next_step ON outreach_contacts(next_step_date);
CREATE INDEX IF NOT EXISTS idx_outreach_replies_classification ON outreach_replies(classification);
CREATE INDEX IF NOT EXISTS idx_outreach_meetings_scheduled ON outreach_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_outreach_deals_stage ON outreach_deals(stage);
CREATE INDEX IF NOT EXISTS idx_outreach_domains_email ON outreach_domains(email_address);


-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE outreach_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_trigger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_social_touches ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_linkedin_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_intent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_heat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_optimization_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_competitor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_voice_commands ENABLE ROW LEVEL SECURITY;

-- RLS policies for all outreach tables
DO $$ BEGIN CREATE POLICY "Service role all outreach_prospects" ON outreach_prospects FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_prospects" ON outreach_prospects FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_prospects" ON outreach_prospects FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_prospects" ON outreach_prospects FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_contacts" ON outreach_contacts FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_contacts" ON outreach_contacts FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_contacts" ON outreach_contacts FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_contacts" ON outreach_contacts FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_campaigns" ON outreach_campaigns FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_campaigns" ON outreach_campaigns FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_campaigns" ON outreach_campaigns FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_campaigns" ON outreach_campaigns FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_sequences" ON outreach_sequences FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_sequences" ON outreach_sequences FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_sequences" ON outreach_sequences FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_sequences" ON outreach_sequences FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_sends" ON outreach_sends FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_sends" ON outreach_sends FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_sends" ON outreach_sends FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_sends" ON outreach_sends FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_replies" ON outreach_replies FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_replies" ON outreach_replies FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_replies" ON outreach_replies FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_replies" ON outreach_replies FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_meetings" ON outreach_meetings FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_meetings" ON outreach_meetings FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_meetings" ON outreach_meetings FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_meetings" ON outreach_meetings FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_proposals" ON outreach_proposals FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_proposals" ON outreach_proposals FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_proposals" ON outreach_proposals FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_proposals" ON outreach_proposals FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_deals" ON outreach_deals FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_deals" ON outreach_deals FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_deals" ON outreach_deals FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_deals" ON outreach_deals FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_domains" ON outreach_domains FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_domains" ON outreach_domains FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_domains" ON outreach_domains FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_domains" ON outreach_domains FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_agent_runs" ON outreach_agent_runs FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_agent_runs" ON outreach_agent_runs FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_agent_runs" ON outreach_agent_runs FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_agent_runs" ON outreach_agent_runs FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_agent_status" ON outreach_agent_status FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_agent_status" ON outreach_agent_status FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_agent_status" ON outreach_agent_status FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_agent_status" ON outreach_agent_status FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_trigger_events" ON outreach_trigger_events FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_trigger_events" ON outreach_trigger_events FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_trigger_events" ON outreach_trigger_events FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_trigger_events" ON outreach_trigger_events FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_social_touches" ON outreach_social_touches FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_social_touches" ON outreach_social_touches FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_social_touches" ON outreach_social_touches FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_social_touches" ON outreach_social_touches FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_linkedin_queue" ON outreach_linkedin_queue FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_linkedin_queue" ON outreach_linkedin_queue FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_linkedin_queue" ON outreach_linkedin_queue FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_linkedin_queue" ON outreach_linkedin_queue FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_intent_signals" ON outreach_intent_signals FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_intent_signals" ON outreach_intent_signals FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_intent_signals" ON outreach_intent_signals FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_intent_signals" ON outreach_intent_signals FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_heat_scores" ON outreach_heat_scores FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_heat_scores" ON outreach_heat_scores FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_heat_scores" ON outreach_heat_scores FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_heat_scores" ON outreach_heat_scores FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_social_posts" ON outreach_social_posts FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_social_posts" ON outreach_social_posts FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_social_posts" ON outreach_social_posts FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_social_posts" ON outreach_social_posts FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_optimization_log" ON outreach_optimization_log FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_optimization_log" ON outreach_optimization_log FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_optimization_log" ON outreach_optimization_log FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_optimization_log" ON outreach_optimization_log FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_competitor_reports" ON outreach_competitor_reports FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_competitor_reports" ON outreach_competitor_reports FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_competitor_reports" ON outreach_competitor_reports FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_competitor_reports" ON outreach_competitor_reports FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "Service role all outreach_voice_commands" ON outreach_voice_commands FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members select outreach_voice_commands" ON outreach_voice_commands FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert outreach_voice_commands" ON outreach_voice_commands FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update outreach_voice_commands" ON outreach_voice_commands FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================
-- updated_at trigger function (idempotent)
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at triggers for tables with updated_at column
CREATE TRIGGER set_outreach_prospects_updated_at BEFORE UPDATE ON outreach_prospects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_outreach_contacts_updated_at BEFORE UPDATE ON outreach_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_outreach_campaigns_updated_at BEFORE UPDATE ON outreach_campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_outreach_meetings_updated_at BEFORE UPDATE ON outreach_meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_outreach_deals_updated_at BEFORE UPDATE ON outreach_deals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_outreach_domains_updated_at BEFORE UPDATE ON outreach_domains FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_outreach_agent_status_updated_at BEFORE UPDATE ON outreach_agent_status FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_outreach_heat_scores_updated_at BEFORE UPDATE ON outreach_heat_scores FOR EACH ROW EXECUTE FUNCTION set_updated_at();
