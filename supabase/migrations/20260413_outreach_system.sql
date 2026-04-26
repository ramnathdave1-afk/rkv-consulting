-- ═══════════════════════════════════════════════════════════════
-- Outreach System Migration (20260413)
-- 10 tables for cold outreach automation, email sequences,
-- reply classification, analytics, tasks, call logs, and hygiene
-- ═══════════════════════════════════════════════════════════════

-- 1. outreach_leads
CREATE TABLE IF NOT EXISTS outreach_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text UNIQUE,
  email_verified boolean DEFAULT false,
  company_name text,
  company_website text,
  title text,
  unit_count integer,
  current_software text,
  city text,
  state text,
  phone text,
  linkedin_url text,
  source text DEFAULT 'manual', -- 'apollo', 'google_maps', 'narpm', 'csv_import', 'referral', 'manual'
  personalization_data jsonb DEFAULT '{}',
  ai_first_line text,
  status text DEFAULT 'new', -- 'new', 'in_sequence', 'replied', 'interested', 'booked', 'closed', 'lost', 'unsubscribed', 'bounced'
  pipeline_stage text DEFAULT 'lead', -- 'lead', 'contacted', 'replied', 'call_booked', 'demo_done', 'pilot', 'negotiation', 'closed_won', 'closed_lost'
  assigned_sequence_id uuid,
  current_step integer DEFAULT 0,
  next_send_at timestamptz,
  last_contacted_at timestamptz,
  sending_account_id uuid,
  notes text,
  deal_value decimal DEFAULT 0,
  lead_score integer DEFAULT 0,
  lead_temperature text DEFAULT 'cold', -- 'hot', 'warm', 'cold'
  competitor_software text,
  re_engagement_count integer DEFAULT 0,
  last_re_engagement_at timestamptz,
  archived_at timestamptz,
  archived_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. outreach_sequences
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text DEFAULT 'initial', -- 'initial', 're_engagement'
  is_active boolean DEFAULT true,
  steps jsonb DEFAULT '[]', -- array of { step_number, delay_days, subject_template, body_template, variant }
  total_sent integer DEFAULT 0,
  total_opened integer DEFAULT 0,
  total_replied integer DEFAULT 0,
  total_booked integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. outreach_emails
CREATE TABLE IF NOT EXISTS outreach_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES outreach_leads(id) ON DELETE CASCADE,
  sequence_id uuid REFERENCES outreach_sequences(id) ON DELETE SET NULL,
  step_number integer,
  sending_account_id uuid,
  subject text,
  body_html text,
  body_text text,
  status text DEFAULT 'scheduled', -- 'scheduled', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed'
  opened_at timestamptz,
  replied_at timestamptz,
  reply_text text,
  reply_classification text,
  message_id text,
  thread_id text,
  sent_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. outreach_sending_accounts
CREATE TABLE IF NOT EXISTS outreach_sending_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text,
  domain text,
  smtp_host text DEFAULT 'smtp.gmail.com',
  smtp_port integer DEFAULT 587,
  smtp_user text,
  smtp_password_encrypted text,
  oauth_refresh_token text,
  daily_send_limit integer DEFAULT 28,
  sent_today integer DEFAULT 0,
  sent_today_reset_at timestamptz DEFAULT now(),
  is_warmed_up boolean DEFAULT false,
  warmup_started_at timestamptz,
  is_active boolean DEFAULT true,
  health_score decimal DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

-- 5. outreach_replies
CREATE TABLE IF NOT EXISTS outreach_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES outreach_leads(id) ON DELETE CASCADE,
  email_id uuid REFERENCES outreach_emails(id) ON DELETE SET NULL,
  from_email text,
  subject text,
  body_text text,
  body_html text,
  ai_classification text, -- 'interested', 'not_interested', 'ooo', 'unsubscribe', 'question', 'referral', 'angry'
  ai_classification_confidence decimal,
  ai_suggested_response text,
  sentiment_score integer,
  urgency text, -- 'high', 'medium', 'low'
  pain_points_mentioned jsonb,
  objections jsonb,
  questions_asked jsonb,
  buying_signals jsonb,
  next_step_suggestion text,
  referred_person jsonb,
  is_handled boolean DEFAULT false,
  handled_at timestamptz,
  received_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 6. outreach_analytics_daily
CREATE TABLE IF NOT EXISTS outreach_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  emails_sent integer DEFAULT 0,
  emails_delivered integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  emails_replied integer DEFAULT 0,
  emails_bounced integer DEFAULT 0,
  positive_replies integer DEFAULT 0,
  calls_booked integer DEFAULT 0,
  sequence_id uuid REFERENCES outreach_sequences(id) ON DELETE SET NULL,
  sending_account_id uuid REFERENCES outreach_sending_accounts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 7. outreach_tasks
CREATE TABLE IF NOT EXISTS outreach_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES outreach_leads(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'follow_up_call', 'send_proposal', 'follow_up_email', 'reschedule', 'review_referral', 'post_demo', 'custom'
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  due_time time,
  priority text DEFAULT 'normal', -- 'urgent', 'normal', 'low'
  status text DEFAULT 'pending', -- 'pending', 'completed', 'skipped', 'overdue'
  created_by text DEFAULT 'manual', -- 'system', 'manual'
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 8. outreach_call_logs
CREATE TABLE IF NOT EXISTS outreach_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES outreach_leads(id) ON DELETE CASCADE,
  call_date timestamptz DEFAULT now(),
  duration_minutes integer,
  outcome text, -- 'showed_up', 'no_show', 'rescheduled', 'cancelled'
  interest_level text, -- 'very_interested', 'interested', 'lukewarm', 'not_interested'
  pain_points_discussed jsonb DEFAULT '[]',
  features_demoed jsonb DEFAULT '[]',
  objections_raised jsonb DEFAULT '[]',
  next_step text,
  next_step_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 9. outreach_suppression
CREATE TABLE IF NOT EXISTS outreach_suppression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  reason text NOT NULL, -- 'hard_bounce', 'unsubscribe', 'spam_complaint', 'manual', 'competitor'
  original_lead_id uuid REFERENCES outreach_leads(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 10. outreach_hygiene_log
CREATE TABLE IF NOT EXISTS outreach_hygiene_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL, -- 'duplicate_merged', 'dead_removed', 'bounce_suppressed', 'dedup_flagged', 'archived'
  lead_id uuid REFERENCES outreach_leads(id) ON DELETE SET NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- Foreign Keys (deferred to avoid ordering issues)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE outreach_leads ADD CONSTRAINT fk_leads_sequence FOREIGN KEY (assigned_sequence_id) REFERENCES outreach_sequences(id) ON DELETE SET NULL;
ALTER TABLE outreach_leads ADD CONSTRAINT fk_leads_account FOREIGN KEY (sending_account_id) REFERENCES outreach_sending_accounts(id) ON DELETE SET NULL;

ALTER TABLE outreach_emails ADD CONSTRAINT fk_emails_account FOREIGN KEY (sending_account_id) REFERENCES outreach_sending_accounts(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════
-- Indexes for Performance
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX idx_leads_status ON outreach_leads(status);
CREATE INDEX idx_leads_pipeline ON outreach_leads(pipeline_stage);
CREATE INDEX idx_leads_email ON outreach_leads(email);
CREATE INDEX idx_leads_next_send ON outreach_leads(next_send_at) WHERE next_send_at IS NOT NULL;
CREATE INDEX idx_leads_score ON outreach_leads(lead_score DESC);
CREATE INDEX idx_emails_lead ON outreach_emails(lead_id);
CREATE INDEX idx_emails_status ON outreach_emails(status);
CREATE INDEX idx_emails_scheduled ON outreach_emails(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_replies_lead ON outreach_replies(lead_id);
CREATE INDEX idx_replies_classification ON outreach_replies(ai_classification);
CREATE INDEX idx_replies_handled ON outreach_replies(is_handled) WHERE is_handled = false;
CREATE INDEX idx_tasks_status ON outreach_tasks(status);
CREATE INDEX idx_tasks_due ON outreach_tasks(due_date);
CREATE INDEX idx_analytics_date ON outreach_analytics_daily(date);
CREATE INDEX idx_suppression_email ON outreach_suppression(email);
CREATE INDEX idx_hygiene_action ON outreach_hygiene_log(action);

-- ═══════════════════════════════════════════════════════════════
-- Triggers
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON outreach_leads FOR EACH ROW EXECUTE FUNCTION update_outreach_updated_at();
CREATE TRIGGER trg_sequences_updated_at BEFORE UPDATE ON outreach_sequences FOR EACH ROW EXECUTE FUNCTION update_outreach_updated_at();
