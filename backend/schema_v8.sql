-- schema_v8.sql
-- 1. Referral & DNA Profile additions to users
ALTER TABLE jarvis_users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE jarvis_users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES jarvis_users(id);
ALTER TABLE jarvis_users ADD COLUMN IF NOT EXISTS dna_profile JSONB DEFAULT '{}';
ALTER TABLE jarvis_users ADD COLUMN IF NOT EXISTS morning_brief_enabled BOOLEAN DEFAULT FALSE;

-- 2. Public Activity Table
CREATE TABLE IF NOT EXISTS public_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'app_build', 'email_processed', 'task_completed'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Morning Briefs tracking
CREATE TABLE IF NOT EXISTS morning_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES jarvis_users(id),
    content TEXT,
    status TEXT DEFAULT 'pending', -- 'sent', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
