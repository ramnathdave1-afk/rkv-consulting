-- ============================================================
-- 003_automation_webhooks.sql
-- Phase 8: Automation & Zapier Webhooks
-- Adds: webhook_configs, webhook_logs tables
-- ============================================================

-- ============================================================
-- 1. webhook_configs — stores each user's Zapier/webhook URL + enabled events
-- ============================================================
create table if not exists webhook_configs (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references profiles(id) on delete cascade not null unique,
  webhook_url     text not null,
  events_enabled  jsonb default '[]'::jsonb,
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- 2. webhook_logs — audit trail for every webhook fired
-- ============================================================
create table if not exists webhook_logs (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references profiles(id) on delete cascade not null,
  event_type      text not null,
  payload         jsonb not null default '{}'::jsonb,
  response_status integer,
  response_body   text,
  error           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- 3. Row Level Security
-- ============================================================
alter table webhook_configs enable row level security;
alter table webhook_logs    enable row level security;

create policy "Users manage own webhook_configs"
  on webhook_configs for all
  using (auth.uid() = user_id);

create policy "Users manage own webhook_logs"
  on webhook_logs for all
  using (auth.uid() = user_id);

-- ============================================================
-- 4. Indexes
-- ============================================================
create index if not exists idx_webhook_configs_user on webhook_configs(user_id);
create index if not exists idx_webhook_logs_user on webhook_logs(user_id);
create index if not exists idx_webhook_logs_event_type on webhook_logs(event_type);
create index if not exists idx_webhook_logs_created on webhook_logs(created_at desc);
