-- Add credits to jarvis_users or create a new balance table.
-- I'll add it to jarvis_users for simplicity since it's a global balance.
ALTER TABLE jarvis_users ADD COLUMN IF NOT EXISTS credits FLOAT DEFAULT 0.0;

-- We can also create a credits_transactions table for audit.
CREATE TABLE IF NOT EXISTS jarvis_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jarvis_users(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL,
    type TEXT NOT NULL, -- 'topup' | 'consumption'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
