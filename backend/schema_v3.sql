-- Run AFTER schema_v2.sql in Supabase SQL Editor

create table if not exists jarvis_subscriptions (
  user_id uuid primary key references jarvis_users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',         -- free | starter | pro
  status text not null default 'active',     -- active | canceled | past_due | trialing
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists jarvis_usage_counters (
  user_id uuid not null references jarvis_users(id) on delete cascade,
  period text not null,                      -- YYYY-MM
  builds_used int default 0,
  chat_messages_used int default 0,
  primary key (user_id, period)
);

create index if not exists idx_subs_customer on jarvis_subscriptions(stripe_customer_id);
