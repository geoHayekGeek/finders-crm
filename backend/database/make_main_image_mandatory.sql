-- Migration: Make main_image mandatory in properties table
-- This migration:
-- 1. Sets a default placeholder image for existing properties with NULL main_image
-- 2. Makes main_image NOT NULL

-- Step 1: Set a default placeholder for existing NULL main_image values
-- Using a simple data URI for a 1x1 transparent PNG as placeholder
DO $$ 
BEGIN
    UPDATE properties 
    SET main_image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    WHERE main_image IS NULL;
    
    RAISE NOTICE 'Updated % properties with NULL main_image to use placeholder', (SELECT COUNT(*) FROM properties WHERE main_image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
END $$;

-- Step 2: Make main_image NOT NULL
DO $$ 
BEGIN
    -- Check if the column is already NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'properties' 
        AND column_name = 'main_image' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE properties ALTER COLUMN main_image SET NOT NULL;
        RAISE NOTICE 'Made main_image column NOT NULL';
    ELSE
        RAISE NOTICE 'main_image column is already NOT NULL';
    END IF;
END $$;
