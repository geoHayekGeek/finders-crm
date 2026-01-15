-- Migration: Make main_image nullable for property creation
-- This allows properties to be created without main_image initially,
-- as the image will be uploaded separately via the file upload endpoint
-- (This matches how the edit flow works and fixes the create property image issue)

-- Step 1: Make main_image nullable
DO $$ 
BEGIN
    -- Check if the column is currently NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'main_image' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE properties ALTER COLUMN main_image DROP NOT NULL;
        RAISE NOTICE 'Made main_image column nullable';
    ELSE
        RAISE NOTICE 'main_image column is already nullable';
    END IF;
END $$;

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'properties' 
AND column_name = 'main_image';
