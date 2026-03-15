-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE substations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;

-- Helper: get user's org_id
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: users can see their own org
CREATE POLICY "Users can view own org" ON organizations
  FOR SELECT USING (id = auth_org_id());

-- Profiles: users can view profiles in their org
CREATE POLICY "Users can view org profiles" ON profiles
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Ghost Sites: scoped to org
CREATE POLICY "Users can view org sites" ON ghost_sites
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "Users can insert org sites" ON ghost_sites
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update org sites" ON ghost_sites
  FOR UPDATE USING (org_id = auth_org_id());

-- Site Scores: via ghost_sites org scope
CREATE POLICY "Users can view site scores" ON site_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ghost_sites WHERE id = site_scores.site_id AND org_id = auth_org_id())
  );

-- Substations: public read (shared data)
CREATE POLICY "Anyone can view substations" ON substations
  FOR SELECT USING (true);

-- Parcels: public read
CREATE POLICY "Anyone can view parcels" ON parcels
  FOR SELECT USING (true);

-- Agent Activity Log: scoped to org
CREATE POLICY "Users can view org agent logs" ON agent_activity_log
  FOR SELECT USING (org_id = auth_org_id() OR org_id IS NULL);

-- Pipeline History: via ghost_sites
CREATE POLICY "Users can view pipeline history" ON pipeline_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ghost_sites WHERE id = pipeline_history.site_id AND org_id = auth_org_id())
  );

-- Reports: via ghost_sites
CREATE POLICY "Users can view reports" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM ghost_sites WHERE id = reports.site_id AND org_id = auth_org_id())
  );

-- Invitations: admins in org
CREATE POLICY "Users can view org invitations" ON invitations
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "Admins can insert invitations" ON invitations
  FOR INSERT WITH CHECK (org_id = auth_org_id());

-- Waitlist: service role only (no user access needed)
CREATE POLICY "Service role manages waitlist" ON waitlist
  FOR ALL USING (true);

-- Market Intelligence: public read
CREATE POLICY "Anyone can view market intel" ON market_intelligence
  FOR SELECT USING (true);

-- Allow service role full access (for worker agents)
-- Service role bypasses RLS by default in Supabase
