-- Migration: Update users table - Add address column and remove location column
-- Date: 2025-01-08
-- Description: 
--   1. Adds 'address' column (TEXT, nullable) to users table if it doesn't exist
--   2. Removes 'location' column from users table if it exists
--   This migration is idempotent and safe to run multiple times

BEGIN;

-- Step 1: Add address column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'address'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE users ADD COLUMN address TEXT;
        RAISE NOTICE '✅ Added address column to users table';
    ELSE
        RAISE NOTICE 'ℹ️  address column already exists in users table';
    END IF;
END $$;

-- Add comment to address column (will update if already exists)
COMMENT ON COLUMN users.address IS 'Physical address of the user/agent';

-- Step 2: Remove location column if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'location'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE users DROP COLUMN location;
        RAISE NOTICE '✅ Removed location column from users table';
    ELSE
        RAISE NOTICE 'ℹ️  location column does not exist in users table';
    END IF;
END $$;

-- Step 3: Verify the migration
DO $$
DECLARE
    address_exists BOOLEAN;
    location_exists BOOLEAN;
BEGIN
    -- Check if address column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'address'
        AND table_schema = 'public'
    ) INTO address_exists;
    
    -- Check if location column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'location'
        AND table_schema = 'public'
    ) INTO location_exists;
    
    -- Report results
    IF address_exists AND NOT location_exists THEN
        RAISE NOTICE '✅ Migration verification successful: address column exists, location column removed';
    ELSIF address_exists AND location_exists THEN
        RAISE WARNING '⚠️  Migration incomplete: address exists but location still exists';
    ELSIF NOT address_exists AND NOT location_exists THEN
        RAISE WARNING '⚠️  Migration incomplete: address column not found';
    ELSE
        RAISE WARNING '⚠️  Unexpected state after migration';
    END IF;
END $$;

COMMIT;

