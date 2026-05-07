-- Run AFTER schema_v3.sql

create table if not exists jarvis_personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references jarvis_users(id) on delete cascade,
  assistant_id text not null,           -- jarvis | judy | alfred | venus | donna
  system_prompt text not null default '',
  custom_name text,                      -- optional override
  updated_at timestamptz default now(),
  unique (user_id, assistant_id)
);
