-- schema_v9.sql
-- Daily free credit reset via pg_cron (à activer dans Supabase)
-- Nécessite l'extension pg_cron activée dans les settings Supabase

-- Add the missing tier column that backend expects
ALTER TABLE jarvis_users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';

-- Option 1 : pg_cron (si disponible dans votre plan Supabase)
-- Resette les crédits des utilisateurs gratuits à minuit UTC
-- SELECT cron.schedule(
--   'reset-free-credits',       -- nom du job
--   '0 0 * * *',                -- cron expression: minuit UTC chaque jour
--   $$
--     UPDATE jarvis_users
--     SET credits = CASE
--       WHEN referred_by IS NOT NULL THEN 100.0  -- referred users get 100
--       ELSE 50.0                                -- standard free get 50
--     END
--     WHERE tier IS NULL OR tier = 'free';
--   $$
-- );

-- Option 2 : Fonction SQL à appeler manuellement ou via le daemon Python
CREATE OR REPLACE FUNCTION reset_free_user_credits()
RETURNS void AS $$
BEGIN
  UPDATE jarvis_users
  SET credits = CASE
    WHEN referred_by IS NOT NULL THEN 100.0
    ELSE 50.0
  END
  WHERE tier IS NULL OR tier = 'free' OR tier = '';
END;
$$ LANGUAGE plpgsql;

-- Ajouter index pour performance
CREATE INDEX IF NOT EXISTS idx_users_tier ON jarvis_users(tier);
CREATE INDEX IF NOT EXISTS idx_users_referral ON jarvis_users(referral_code);
