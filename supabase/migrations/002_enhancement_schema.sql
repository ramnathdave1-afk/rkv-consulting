-- ============================================================
-- 002_enhancement_schema.sql
-- Enhancement schema for RKV Consulting Platform v2
-- Adds: screening applications, contractor bids, preventive
-- schedules, agent sequences, referrals + column additions
-- ============================================================

-- ============================================================
-- 1. New Tables
-- ============================================================

-- Screening applications (public-facing tenant applications)
create table if not exists screening_applications (
  id                       uuid default uuid_generate_v4() primary key,
  user_id                  uuid references profiles(id) on delete cascade not null,
  property_id              uuid references properties(id) on delete set null,
  token                    text unique not null,
  applicant_name           text,
  applicant_email          text,
  applicant_phone          text,
  date_of_birth            date,
  current_address          text,
  current_landlord         text,
  current_landlord_phone   text,
  employer                 text,
  monthly_income           numeric,
  move_in_date             date,
  number_of_occupants      integer default 1,
  pets                     boolean default false,
  pet_details              text,
  consent_background       boolean default false,
  consent_credit           boolean default false,
  status                   text default 'pending' check (status in ('pending', 'submitted', 'screening', 'completed', 'expired')),
  result_data              jsonb,
  expires_at               timestamptz not null,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- Contractor bids for maintenance requests
create table if not exists contractor_bids (
  id                       uuid default uuid_generate_v4() primary key,
  user_id                  uuid references profiles(id) on delete cascade not null,
  maintenance_request_id   uuid references maintenance_requests(id) on delete cascade not null,
  contractor_id            uuid references contractors(id) on delete cascade not null,
  price                    numeric,
  timeline                 text,
  warranty                 text,
  notes                    text,
  status                   text default 'requested' check (status in ('requested', 'submitted', 'accepted', 'rejected')),
  submitted_at             timestamptz,
  created_at               timestamptz default now()
);

-- Preventive maintenance schedules
create table if not exists preventive_schedules (
  id                       uuid default uuid_generate_v4() primary key,
  user_id                  uuid references profiles(id) on delete cascade not null,
  property_id              uuid references properties(id) on delete cascade not null,
  task_type                text not null check (task_type in ('hvac_service', 'gutter_cleaning', 'fire_detector', 'water_heater', 'roof_inspection', 'pest_inspection')),
  frequency                text default 'annual' check (frequency in ('monthly', 'quarterly', 'semi_annual', 'annual')),
  last_completed           date,
  next_due                 date not null,
  auto_schedule            boolean default false,
  preferred_contractor_id  uuid references contractors(id) on delete set null,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- Agent sequences (email/voice/SMS automation templates)
create table if not exists agent_sequences (
  id                       uuid default uuid_generate_v4() primary key,
  user_id                  uuid references profiles(id) on delete cascade not null,
  name                     text not null,
  type                     text not null check (type in ('rent_reminder', 'lease_renewal', 'welcome', 'maintenance_followup', 'moveout', 'seasonal')),
  agent_type               text not null check (agent_type in ('email', 'voice', 'sms')),
  enabled                  boolean default true,
  steps                    jsonb default '[]'::jsonb,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

-- Referral codes
create table if not exists referral_codes (
  id                       uuid default uuid_generate_v4() primary key,
  user_id                  uuid references profiles(id) on delete cascade not null,
  code                     text unique not null,
  referred_count           integer default 0,
  total_earnings           numeric default 0,
  created_at               timestamptz default now()
);

-- ============================================================
-- 2. Alter Existing Tables
-- ============================================================

-- Properties: add insurance, zoning, depreciation fields
alter table properties add column if not exists insurance_carrier text;
alter table properties add column if not exists insurance_deductible numeric;
alter table properties add column if not exists insurance_coverage numeric;
alter table properties add column if not exists zoning_code text;
alter table properties add column if not exists zoning_data jsonb;
alter table properties add column if not exists depreciation_start_date date;
alter table properties add column if not exists depreciation_basis numeric;
alter table properties add column if not exists flood_zone text;
alter table properties add column if not exists opportunity_zone boolean default false;

-- Deals: add saved analyzer inputs
alter table deals add column if not exists saved_inputs jsonb;
alter table deals add column if not exists compare_group_id text;

-- Transactions: add AI category suggestion
alter table transactions add column if not exists ai_category_suggestion text;
alter table transactions add column if not exists ai_confidence numeric;
alter table transactions add column if not exists reconciled boolean default false;

-- Documents: add AI detection fields
alter table documents add column if not exists ai_detected_type text;
alter table documents add column if not exists ai_extracted_data jsonb;
alter table documents add column if not exists expiration_date date;

-- Profiles: add referral and onboarding fields
alter table profiles add column if not exists referral_code text unique;
alter table profiles add column if not exists referred_by text;
alter table profiles add column if not exists onboarding_step integer default 0;
alter table profiles add column if not exists investor_type text;
alter table profiles add column if not exists portfolio_size_range text;
alter table profiles add column if not exists primary_strategy text;

-- ============================================================
-- 3. Row Level Security on New Tables
-- ============================================================

alter table screening_applications enable row level security;
alter table contractor_bids        enable row level security;
alter table preventive_schedules   enable row level security;
alter table agent_sequences        enable row level security;
alter table referral_codes         enable row level security;

create policy "Users manage own screening_applications"
  on screening_applications for all
  using (auth.uid() = user_id);

create policy "Users manage own contractor_bids"
  on contractor_bids for all
  using (auth.uid() = user_id);

create policy "Users manage own preventive_schedules"
  on preventive_schedules for all
  using (auth.uid() = user_id);

create policy "Users manage own agent_sequences"
  on agent_sequences for all
  using (auth.uid() = user_id);

create policy "Users manage own referral_codes"
  on referral_codes for all
  using (auth.uid() = user_id);

-- Public access for screening applications via token (applicants need to read/update)
create policy "Public can submit screening applications by token"
  on screening_applications for update
  using (true)
  with check (true);

create policy "Public can read screening applications by token"
  on screening_applications for select
  using (true);

-- ============================================================
-- 4. Indexes
-- ============================================================

create index if not exists idx_screening_applications_token on screening_applications(token);
create index if not exists idx_screening_applications_user on screening_applications(user_id);
create index if not exists idx_contractor_bids_request on contractor_bids(maintenance_request_id);
create index if not exists idx_preventive_schedules_property on preventive_schedules(property_id);
create index if not exists idx_preventive_schedules_next_due on preventive_schedules(next_due);
create index if not exists idx_agent_sequences_user on agent_sequences(user_id);
create index if not exists idx_referral_codes_code on referral_codes(code);
create index if not exists idx_referral_codes_user on referral_codes(user_id);
create index if not exists idx_documents_expiration on documents(expiration_date) where expiration_date is not null;
create index if not exists idx_transactions_ai_category on transactions(ai_category_suggestion) where ai_category_suggestion is not null;
