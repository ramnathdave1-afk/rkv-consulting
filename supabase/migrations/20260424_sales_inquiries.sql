-- Sales inquiries from the public pricing / talk-to-sales form.
--
-- Public Stripe Checkout was disabled in favor of negotiated pricing. The
-- pricing page now POSTs to /api/contact/sales which writes to this table
-- and emails the sales notify address.

CREATE TABLE IF NOT EXISTS sales_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  portfolio_size text,
  current_software text,
  message text,
  status text NOT NULL DEFAULT 'new',  -- 'new' | 'contacted' | 'qualified' | 'closed'
  source text NOT NULL DEFAULT 'pricing_page',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_inquiries_status_created
  ON sales_inquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_inquiries_email
  ON sales_inquiries (email);

-- RLS: only super-admins read/write directly; the app uses the service role.
ALTER TABLE sales_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_read_sales_inquiries" ON sales_inquiries;
CREATE POLICY "super_admin_read_sales_inquiries"
  ON sales_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "super_admin_update_sales_inquiries" ON sales_inquiries;
CREATE POLICY "super_admin_update_sales_inquiries"
  ON sales_inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );
