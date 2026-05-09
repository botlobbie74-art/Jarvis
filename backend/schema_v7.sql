-- schema_v7.sql
-- Logging table for the intelligent LLM router

CREATE TABLE IF NOT EXISTS model_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    user_tier TEXT NOT NULL,
    credits_consumed INTEGER DEFAULT 0,
    status TEXT NOT NULL, -- 'success', 'fallback', 'error'
    retry_count INTEGER DEFAULT 0,
    latency_ms INTEGER,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
