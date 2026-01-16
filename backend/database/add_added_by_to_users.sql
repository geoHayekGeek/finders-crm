-- Migration: Add added_by column to users table
-- This tracks which user created each user account

-- Add added_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'added_by') THEN
        ALTER TABLE users ADD COLUMN added_by INTEGER;
        RAISE NOTICE '✅ Added added_by column to users table';
    ELSE
        RAISE NOTICE 'ℹ️  added_by column already exists in users table';
    END IF;
END $$;

-- Add foreign key constraint to reference users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_added_by' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_added_by 
        FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added foreign key constraint for added_by';
    ELSE
        RAISE NOTICE 'ℹ️  Foreign key constraint for added_by already exists';
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_added_by ON users(added_by);

-- Add comment to column
COMMENT ON COLUMN users.added_by IS 'ID of the user who created this user account';
