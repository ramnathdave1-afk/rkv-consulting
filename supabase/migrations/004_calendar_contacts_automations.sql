-- ============================================================================
-- Migration 004: Calendar Events, Contacts CRM, Automations, Vacancy Listings
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Calendar Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  type TEXT NOT NULL DEFAULT 'other',
  color TEXT DEFAULT '#059669',
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  amount DECIMAL(12,2),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'auto' or 'manual'
  reminder BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendar events"
  ON calendar_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_calendar_events_user_date ON calendar_events(user_id, date);

-- ---------------------------------------------------------------------------
-- 2. Contacts CRM
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  type TEXT NOT NULL DEFAULT 'other',
  relationship_score INTEGER DEFAULT 5 CHECK (relationship_score >= 1 AND relationship_score <= 10),
  last_contacted DATE,
  birthday DATE,
  preferred_contact_method TEXT DEFAULT 'email',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contacts"
  ON contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_contacts_user_type ON contacts(user_id, type);

-- Contact activity log
CREATE TABLE IF NOT EXISTS contact_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'email', 'call', 'meeting', 'note', 'deal'
  description TEXT NOT NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own contact activities"
  ON contact_activities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Deal-contact linking table
CREATE TABLE IF NOT EXISTS deal_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT, -- 'agent', 'lender', 'attorney', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, contact_id)
);

ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage deal contacts via deals"
  ON deal_contacts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_contacts.deal_id AND deals.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_contacts.deal_id AND deals.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Automation Configurations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  last_triggered TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

ALTER TABLE automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own automation configs"
  ON automation_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Custom workflows
CREATE TABLE IF NOT EXISTS custom_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  enabled BOOLEAN DEFAULT false,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom workflows"
  ON custom_workflows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Automation activity log
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  automation_type TEXT NOT NULL,
  workflow_id UUID REFERENCES custom_workflows(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  affected_entity TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  outcome TEXT DEFAULT 'success',
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own automation logs"
  ON automation_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_automation_logs_user_date ON automation_logs(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Vacancy Listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacancy_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  highlights TEXT[] DEFAULT '{}',
  rental_price DECIMAL(10,2),
  deposit DECIMAL(10,2),
  lease_length TEXT DEFAULT '12 months',
  pet_policy TEXT DEFAULT 'No pets',
  platforms JSONB DEFAULT '{"zillow": false, "facebook": false, "apartments_com": false, "craigslist": false}'::jsonb,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vacancy_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vacancy listings"
  ON vacancy_listings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Vacancy inquiries
CREATE TABLE IF NOT EXISTS vacancy_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES vacancy_listings(id) ON DELETE SET NULL,
  prospect_name TEXT NOT NULL,
  prospect_email TEXT,
  prospect_phone TEXT,
  message TEXT,
  source TEXT DEFAULT 'direct',
  interest_score TEXT DEFAULT 'medium', -- high, medium, low
  status TEXT DEFAULT 'new', -- new, contacted, showing_scheduled, application_sent, closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vacancy_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vacancy inquiries"
  ON vacancy_inquiries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Showing appointments
CREATE TABLE IF NOT EXISTS showing_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES vacancy_inquiries(id) ON DELETE SET NULL,
  prospect_name TEXT NOT NULL,
  prospect_email TEXT,
  prospect_phone TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, canceled
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE showing_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own showing appointments"
  ON showing_appointments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Profile additions for beginner mode
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_mode TEXT DEFAULT 'standard';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dismissed_tips TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 6. Deal pipeline enhancements
-- ---------------------------------------------------------------------------
ALTER TABLE deals ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}'::jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE deals ADD COLUMN IF NOT EXISTS follow_up_date DATE;
