-- ============================================================
-- 001_initial_schema.sql
-- Complete database schema for RKV Consulting - AI Real Estate Platform
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles
-- ============================================================
create table profiles (
  id                       uuid references auth.users on delete cascade primary key,
  email                    text,
  full_name                text,
  avatar_url               text,
  phone                    text,
  stripe_customer_id       text unique,
  onboarding_completed     boolean default false,
  investor_type            text,
  primary_strategy         text,
  portfolio_size_range     text,
  seen_tooltips            jsonb default '[]'::jsonb,
  notification_preferences jsonb default '{"email": true, "sms": true, "push": true}'::jsonb,
  ai_tone_preference       text default 'professional',
  calling_hours_start      time default '09:00',
  calling_hours_end        time default '19:00',
  autopilot_enabled        boolean default false,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- ============================================================
-- 2. subscriptions
-- ============================================================
create table subscriptions (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references profiles(id) on delete cascade not null,
  stripe_subscription_id text unique,
  stripe_price_id       text,
  plan_name             text check (plan_name in ('basic', 'pro', 'elite')),
  status                text,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean default false,
  trial_end             timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- 3. properties
-- ============================================================
create table properties (
  id                      uuid default uuid_generate_v4() primary key,
  user_id                 uuid references profiles(id) on delete cascade not null,
  address                 text not null,
  unit                    text,
  city                    text,
  state                   text,
  zip                     text,
  lat                     double precision,
  lng                     double precision,
  property_type           text,
  status                  text default 'active',
  purchase_price          numeric,
  purchase_date           date,
  current_value           numeric,
  bedrooms                integer,
  bathrooms               numeric,
  sqft                    integer,
  year_built              integer,
  mortgage_balance        numeric,
  mortgage_rate           numeric,
  mortgage_payment        numeric,
  mortgage_lender         text,
  mortgage_maturity_date  date,
  insurance_annual        numeric,
  insurance_provider      text,
  insurance_policy_number text,
  insurance_expiry        date,
  tax_annual              numeric,
  hoa_monthly             numeric,
  notes                   text,
  images                  jsonb default '[]'::jsonb,
  attom_data              jsonb,
  rentcast_data           jsonb,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- 4. tenants
-- ============================================================
create table tenants (
  id                            uuid default uuid_generate_v4() primary key,
  user_id                       uuid references profiles(id) on delete cascade not null,
  property_id                   uuid references properties(id) on delete cascade not null,
  first_name                    text,
  last_name                     text,
  email                         text,
  phone                         text,
  date_of_birth                 date,
  emergency_contact_name        text,
  emergency_contact_phone       text,
  emergency_contact_relation    text,
  vehicle_make                  text,
  vehicle_model                 text,
  vehicle_plate                 text,
  lease_start                   date,
  lease_end                     date,
  monthly_rent                  numeric,
  security_deposit              numeric,
  deposit_held                  numeric,
  rent_due_day                  integer default 1,
  late_fee_amount               numeric default 50,
  late_fee_grace_days           integer default 5,
  payment_method                text,
  stripe_customer_id            text,
  status                        text default 'active',
  screening_score               integer,
  screening_recommendation      text,
  notes                         text,
  move_in_checklist_completed   boolean default false,
  renters_insurance_provider    text,
  renters_insurance_policy      text,
  renters_insurance_expiry      date,
  created_at                    timestamptz default now(),
  updated_at                    timestamptz default now()
);

-- ============================================================
-- 5. deals
-- ============================================================
create table deals (
  id                      uuid default uuid_generate_v4() primary key,
  user_id                 uuid references profiles(id) on delete cascade not null,
  name                    text,
  address                 text,
  city                    text,
  state                   text,
  zip                     text,
  lat                     double precision,
  lng                     double precision,
  asking_price            numeric,
  offer_price             numeric,
  property_type           text,
  bedrooms                integer,
  bathrooms               numeric,
  sqft                    integer,
  year_built              integer,
  status                  text default 'reviewing',
  source                  text,
  down_payment_pct        numeric,
  interest_rate           numeric,
  loan_term               integer default 30,
  monthly_rent_estimate   numeric,
  vacancy_rate            numeric default 5,
  monthly_expenses        numeric,
  rehab_estimate          numeric,
  arv                     numeric,
  annual_appreciation     numeric default 3,
  annual_rent_growth      numeric default 2,
  analysis_data           jsonb,
  ai_recommendation       text,
  ai_reasoning            text,
  ai_score                numeric,
  ai_suggested_offer      numeric,
  red_flags               jsonb default '[]'::jsonb,
  notes                   text,
  rentcast_data           jsonb,
  attom_data              jsonb,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ============================================================
-- 6. transactions
-- ============================================================
create table transactions (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references profiles(id) on delete cascade not null,
  property_id           uuid references properties(id) on delete set null,
  tenant_id             uuid references tenants(id) on delete set null,
  type                  text check (type in ('income', 'expense')) not null,
  category              text,
  amount                numeric not null,
  description           text,
  date                  date not null,
  receipt_url           text,
  reconciled            boolean default false,
  plaid_transaction_id  text,
  tax_deductible        boolean default true,
  notes                 text,
  created_at            timestamptz default now()
);

-- ============================================================
-- 7. rent_payments
-- ============================================================
create table rent_payments (
  id                       uuid default uuid_generate_v4() primary key,
  user_id                  uuid references profiles(id) on delete cascade not null,
  tenant_id                uuid references tenants(id) on delete cascade not null,
  property_id              uuid references properties(id) on delete set null,
  amount_due               numeric not null,
  amount_paid              numeric default 0,
  due_date                 date not null,
  paid_date                date,
  payment_method           text,
  late_fee_charged         numeric default 0,
  status                   text default 'pending',
  stripe_payment_intent_id text,
  notes                    text,
  created_at               timestamptz default now()
);

-- ============================================================
-- 8. contractors (before maintenance_requests due to FK dependency)
-- ============================================================
create table contractors (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references profiles(id) on delete cascade not null,
  company_name          text,
  contact_name          text,
  email                 text,
  phone                 text,
  trade                 text,
  trades                jsonb default '[]'::jsonb,
  license_number        text,
  license_expiry        date,
  insurance_provider    text,
  insurance_expiry      date,
  google_rating         numeric,
  google_review_count   integer,
  score_composite       numeric,
  score_quality         numeric,
  score_price_fairness  numeric,
  score_reliability     numeric,
  score_responsiveness  numeric,
  price_range_min       numeric,
  price_range_max       numeric,
  ai_review_summary     text,
  pros                  jsonb default '[]'::jsonb,
  cons                  jsonb default '[]'::jsonb,
  city                  text,
  state                 text,
  service_radius        integer,
  notes                 text,
  source                text,
  external_id           text,
  profile_url           text,
  website_url           text,
  jobs_completed        integer default 0,
  total_spent           numeric default 0,
  last_used_date        date,
  is_preferred          boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- 9. maintenance_requests
-- ============================================================
create table maintenance_requests (
  id                           uuid default uuid_generate_v4() primary key,
  user_id                      uuid references profiles(id) on delete cascade not null,
  property_id                  uuid references properties(id) on delete cascade not null,
  tenant_id                    uuid references tenants(id) on delete set null,
  title                        text not null,
  description                  text,
  category                     text,
  priority                     text default 'normal',
  status                       text default 'open',
  contractor_id                uuid references contractors(id) on delete set null,
  contractor_name              text,
  contractor_phone             text,
  estimated_cost               numeric,
  actual_cost                  numeric,
  bid_data                     jsonb,
  scheduled_date               date,
  completed_date               date,
  images                       jsonb default '[]'::jsonb,
  completion_photos            jsonb default '[]'::jsonb,
  tenant_satisfaction_rating   integer,
  notes                        text,
  created_at                   timestamptz default now(),
  updated_at                   timestamptz default now()
);

-- ============================================================
-- 10. agent_logs
-- ============================================================
create table agent_logs (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references profiles(id) on delete cascade not null,
  tenant_id             uuid references tenants(id) on delete set null,
  property_id           uuid references properties(id) on delete set null,
  agent_type            text check (agent_type in ('email', 'voice', 'sms')) not null,
  trigger_event         text,
  subject               text,
  content               text,
  outcome               text,
  tenant_response       text,
  recording_url         text,
  transcript            text,
  call_duration_seconds integer,
  payment_collected     numeric,
  action_taken          text,
  status                text default 'sent',
  created_at            timestamptz default now()
);

-- ============================================================
-- 11. documents
-- ============================================================
create table documents (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references profiles(id) on delete cascade not null,
  property_id           uuid references properties(id) on delete set null,
  tenant_id             uuid references tenants(id) on delete set null,
  deal_id               uuid references deals(id) on delete set null,
  name                  text not null,
  type                  text,
  file_url              text,
  file_size             bigint,
  mime_type             text,
  expires_at            timestamptz,
  extracted_data        jsonb,
  tags                  jsonb default '[]'::jsonb,
  signed                boolean default false,
  docusign_envelope_id  text,
  created_at            timestamptz default now()
);

-- ============================================================
-- 12. notifications
-- ============================================================
create table notifications (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references profiles(id) on delete cascade not null,
  type        text,
  title       text,
  message     text,
  link        text,
  read        boolean default false,
  data        jsonb,
  created_at  timestamptz default now()
);

-- ============================================================
-- 13. watched_markets
-- ============================================================
create table watched_markets (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references profiles(id) on delete cascade not null,
  city              text,
  state             text,
  zip               text,
  metro             text,
  market_type       text default 'metro',
  alert_thresholds  jsonb,
  created_at        timestamptz default now()
);

-- ============================================================
-- 14. ai_conversations
-- ============================================================
create table ai_conversations (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references profiles(id) on delete cascade not null,
  title       text,
  messages    jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- 15. ai_usage
-- ============================================================
create table ai_usage (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references profiles(id) on delete cascade not null,
  month               text not null,
  deal_analyses_used  integer default 0,
  ai_messages_used    integer default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on ALL tables
alter table profiles             enable row level security;
alter table subscriptions        enable row level security;
alter table properties           enable row level security;
alter table tenants              enable row level security;
alter table deals                enable row level security;
alter table transactions         enable row level security;
alter table rent_payments        enable row level security;
alter table maintenance_requests enable row level security;
alter table contractors          enable row level security;
alter table agent_logs           enable row level security;
alter table documents            enable row level security;
alter table notifications        enable row level security;
alter table watched_markets      enable row level security;
alter table ai_conversations     enable row level security;
alter table ai_usage             enable row level security;

-- RLS policies: users can only manage their own rows
create policy "Users manage own profiles"
  on profiles for all
  using (auth.uid() = id);

create policy "Users manage own subscriptions"
  on subscriptions for all
  using (auth.uid() = user_id);

create policy "Users manage own properties"
  on properties for all
  using (auth.uid() = user_id);

create policy "Users manage own tenants"
  on tenants for all
  using (auth.uid() = user_id);

create policy "Users manage own deals"
  on deals for all
  using (auth.uid() = user_id);

create policy "Users manage own transactions"
  on transactions for all
  using (auth.uid() = user_id);

create policy "Users manage own rent_payments"
  on rent_payments for all
  using (auth.uid() = user_id);

create policy "Users manage own maintenance_requests"
  on maintenance_requests for all
  using (auth.uid() = user_id);

create policy "Users manage own contractors"
  on contractors for all
  using (auth.uid() = user_id);

create policy "Users manage own agent_logs"
  on agent_logs for all
  using (auth.uid() = user_id);

create policy "Users manage own documents"
  on documents for all
  using (auth.uid() = user_id);

create policy "Users manage own notifications"
  on notifications for all
  using (auth.uid() = user_id);

create policy "Users manage own watched_markets"
  on watched_markets for all
  using (auth.uid() = user_id);

create policy "Users manage own ai_conversations"
  on ai_conversations for all
  using (auth.uid() = user_id);

create policy "Users manage own ai_usage"
  on ai_usage for all
  using (auth.uid() = user_id);


-- ============================================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
