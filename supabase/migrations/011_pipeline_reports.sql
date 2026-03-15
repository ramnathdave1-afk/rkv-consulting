-- Pipeline History
CREATE TABLE pipeline_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES ghost_sites(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  moved_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_history_site_id ON pipeline_history(site_id);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES ghost_sites(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  report_type TEXT NOT NULL DEFAULT 'full' CHECK (report_type IN ('preliminary', 'full', 'summary')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_site_id ON reports(site_id);

-- Email Log
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  resend_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
