-- Jarvis Agent DB Schema
-- Run this once in Supabase SQL Editor (auto-applied on backend boot when possible)

create extension if not exists "pgcrypto";

create table if not exists jarvis_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists jarvis_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references jarvis_users(id) on delete cascade,
  title text not null default 'New chat',
  assistant_id text not null default 'jarvis',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists jarvis_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references jarvis_chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  assistant_id text not null default 'jarvis',
  created_at timestamptz default now()
);

create table if not exists jarvis_plugins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references jarvis_users(id) on delete cascade,
  plugin_id text not null,
  plugin_name text not null,
  status text not null default 'disconnected',
  connected_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  unique (user_id, plugin_id)
);

create table if not exists jarvis_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references jarvis_users(id) on delete cascade,
  title text not null,
  schedule text,
  plugins jsonb default '[]'::jsonb,
  status text default 'active',
  created_at timestamptz default now()
);

-- Code-agent projects (apps Jarvis builds)
create table if not exists jarvis_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references jarvis_users(id) on delete cascade,
  name text not null,
  description text,
  status text default 'planning',  -- planning | building | ready | error
  plan jsonb default '[]'::jsonb,
  github_repo text,
  github_url text,
  preview_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists jarvis_project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references jarvis_projects(id) on delete cascade,
  path text not null,
  content text not null default '',
  language text default 'plaintext',
  updated_at timestamptz default now(),
  unique (project_id, path)
);

create index if not exists idx_chat_messages_session on jarvis_chat_messages(session_id, created_at);
create index if not exists idx_sessions_user on jarvis_chat_sessions(user_id, updated_at desc);
create index if not exists idx_projects_user on jarvis_projects(user_id, updated_at desc);
