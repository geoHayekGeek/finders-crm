-- Migration: Add address column to users table for agents

-- Add address column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address') THEN
        ALTER TABLE users ADD COLUMN address TEXT;
        RAISE NOTICE 'Added address column to users table';
    ELSE
        RAISE NOTICE 'address column already exists in users table';
    END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN users.address IS 'Physical address of the user/agent';

