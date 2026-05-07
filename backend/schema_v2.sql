-- Run this AFTER schema.sql in Supabase SQL Editor

create table if not exists jarvis_project_state (
  project_id uuid primary key references jarvis_projects(id) on delete cascade,
  current_phase text default 'planning',  -- planning | coding | testing | review | done
  completed_steps jsonb default '[]'::jsonb,
  pending_steps jsonb default '[]'::jsonb,
  decisions jsonb default '[]'::jsonb,    -- [{at, decision, reason}]
  blockers jsonb default '[]'::jsonb,
  last_summary text default '',
  updated_at timestamptz default now()
);

create table if not exists jarvis_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references jarvis_projects(id) on delete cascade,
  agent_type text not null,                -- planner | coder | tester | reviewer
  status text not null default 'queued',   -- queued | processing | done | failed
  payload jsonb default '{}'::jsonb,
  result jsonb,
  parent_job_id uuid,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists jarvis_agent_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references jarvis_projects(id) on delete cascade,
  from_agent text not null,
  to_agent text not null,
  content text not null,
  status text default 'queued',
  created_at timestamptz default now()
);

create table if not exists jarvis_llm_calls (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  role text,                              -- planner | coder | tester | chat
  status text not null,                   -- success | error | quota
  latency_ms integer,
  tokens_in integer,
  tokens_out integer,
  error text,
  created_at timestamptz default now()
);

create index if not exists idx_jobs_status on jarvis_agent_jobs(status, created_at);
create index if not exists idx_jobs_project on jarvis_agent_jobs(project_id, created_at desc);
