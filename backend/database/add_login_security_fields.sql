-- Migration: Add login security fields to users table
-- This adds fields for tracking failed login attempts and account lockout

-- Add failed_login_attempts column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added failed_login_attempts column to users table';
    ELSE
        RAISE NOTICE 'ℹ️  failed_login_attempts column already exists in users table';
    END IF;
END $$;

-- Add lockout_until column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lockout_until') THEN
        ALTER TABLE users ADD COLUMN lockout_until TIMESTAMP;
        RAISE NOTICE '✅ Added lockout_until column to users table';
    ELSE
        RAISE NOTICE 'ℹ️  lockout_until column already exists in users table';
    END IF;
END $$;

-- Add last_login_attempt column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_attempt') THEN
        ALTER TABLE users ADD COLUMN last_login_attempt TIMESTAMP;
        RAISE NOTICE '✅ Added last_login_attempt column to users table';
    ELSE
        RAISE NOTICE 'ℹ️  last_login_attempt column already exists in users table';
    END IF;
END $$;

-- Create index for faster lookups on lockout_until
CREATE INDEX IF NOT EXISTS idx_users_lockout_until ON users(lockout_until) WHERE lockout_until IS NOT NULL;

-- Add comments to columns
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.lockout_until IS 'Timestamp when account lockout expires (NULL if not locked)';
COMMENT ON COLUMN users.last_login_attempt IS 'Timestamp of the last login attempt (successful or failed)';
