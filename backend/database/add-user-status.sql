-- Add is_active status to users table
-- This allows administrators to disable users and prevent them from logging in

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Add comment to column
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active and can log in';
