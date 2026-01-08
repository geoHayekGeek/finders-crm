-- Migration: Remove location column from users table

-- Drop location column if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location') THEN
        ALTER TABLE users DROP COLUMN location;
        RAISE NOTICE 'Removed location column from users table';
    ELSE
        RAISE NOTICE 'location column does not exist in users table';
    END IF;
END $$;

