-- Run AFTER schema_v4.sql in Supabase SQL Editor
-- This adds the credit system tables and columns

-- 1. Add credits column to users
alter table jarvis_users add column if not exists credits numeric(12, 2) default 0.0;

-- 2. Create transactions table
create table if not exists jarvis_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references jarvis_users(id) on delete cascade,
  amount numeric(12, 2) not null,
  type text not null,                -- topup | consumption
  description text,
  created_at timestamptz default now()
);

-- 3. Create index for performance
create index if not exists idx_credit_tx_user on jarvis_credit_transactions(user_id, created_at desc);
