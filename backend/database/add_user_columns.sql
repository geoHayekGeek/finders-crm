-- Migration: Add DOB and user_code columns to users table

-- Add DOB column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'dob') THEN
        ALTER TABLE users ADD COLUMN dob DATE;
        RAISE NOTICE 'Added dob column to users table';
    ELSE
        RAISE NOTICE 'dob column already exists in users table';
    END IF;
END $$;

-- Add user_code column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_code') THEN
        ALTER TABLE users ADD COLUMN user_code VARCHAR(50) UNIQUE;
        RAISE NOTICE 'Added user_code column to users table';
    ELSE
        RAISE NOTICE 'user_code column already exists in users table';
    END IF;
END $$;

-- Create index on user_code if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_user_code ON users(user_code);
