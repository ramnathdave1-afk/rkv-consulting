-- 026: Property Knowledge Base for Voice AI
CREATE TABLE IF NOT EXISTS property_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('amenities', 'rules', 'utilities', 'access', 'parking', 'general', 'pets', 'trash', 'mail', 'emergency')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_knowledge_org ON property_knowledge(org_id);
CREATE INDEX IF NOT EXISTS idx_property_knowledge_property ON property_knowledge(property_id);

ALTER TABLE property_knowledge ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Org members view property_knowledge" ON property_knowledge FOR SELECT USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members insert property_knowledge" ON property_knowledge FOR INSERT WITH CHECK (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members update property_knowledge" ON property_knowledge FOR UPDATE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Org members delete property_knowledge" ON property_knowledge FOR DELETE USING (org_id = auth_org_id()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service role all property_knowledge" ON property_knowledge FOR ALL USING (auth.role() = 'service_role'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
