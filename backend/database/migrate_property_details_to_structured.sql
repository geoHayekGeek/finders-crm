-- Migration: Convert property details from TEXT to JSONB and add structured fields
-- Also add payment_facilities field

-- Step 1: Add new columns for structured data (temporary, will replace old ones)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS details_new JSONB,
ADD COLUMN IF NOT EXISTS interior_details_new JSONB,
ADD COLUMN IF NOT EXISTS payment_facilities BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_facilities_specification TEXT;

-- Step 2: Migrate existing TEXT data to JSONB structure
-- For details: Handle both JSON and plain text
UPDATE properties 
SET details_new = CASE
  -- If it's already valid JSON, use it
  WHEN details::text ~ '^\{.*\}$' THEN 
    CASE 
      WHEN details::text::jsonb IS NOT NULL THEN details::text::jsonb
      ELSE '{}'::jsonb
    END
  -- Otherwise, create empty structured object (text data will be lost, but that's expected)
  ELSE '{}'::jsonb
END
WHERE details IS NOT NULL;

-- Set empty object for NULL details
UPDATE properties 
SET details_new = '{}'::jsonb 
WHERE details IS NULL OR details_new IS NULL;

-- For interior_details: Create structured object (text data will be lost, but that's expected)
UPDATE properties 
SET interior_details_new = '{}'::jsonb
WHERE interior_details IS NOT NULL;

-- Set empty object for NULL interior_details
UPDATE properties 
SET interior_details_new = '{}'::jsonb 
WHERE interior_details IS NULL OR interior_details_new IS NULL;

-- Step 3: Drop dependent views if they exist
DROP VIEW IF EXISTS properties_with_referrals CASCADE;
DROP VIEW IF EXISTS get_properties_with_details CASCADE;

-- Step 4: Drop old columns and rename new ones
ALTER TABLE properties 
DROP COLUMN IF EXISTS details CASCADE,
DROP COLUMN IF EXISTS interior_details CASCADE;

ALTER TABLE properties 
RENAME COLUMN details_new TO details;

ALTER TABLE properties 
RENAME COLUMN interior_details_new TO interior_details;

-- Step 5: Set NOT NULL constraint on new JSONB columns (with default empty objects)
ALTER TABLE properties 
ALTER COLUMN details SET DEFAULT '{}'::jsonb,
ALTER COLUMN interior_details SET DEFAULT '{}'::jsonb;

-- Update any NULL values to empty objects
UPDATE properties 
SET details = '{}'::jsonb WHERE details IS NULL;

UPDATE properties 
SET interior_details = '{}'::jsonb WHERE interior_details IS NULL;

-- Now set NOT NULL
ALTER TABLE properties 
ALTER COLUMN details SET NOT NULL,
ALTER COLUMN interior_details SET NOT NULL;

-- Step 6: Recreate views if they were dropped (optional - adjust based on your needs)
-- Note: You may need to recreate views that reference these columns

-- Step 7: Add comments for documentation
COMMENT ON COLUMN properties.details IS 'Structured property details: floor_number, balcony, covered_parking, outdoor_parking, cave';
COMMENT ON COLUMN properties.interior_details IS 'Structured interior details: living_rooms, bedrooms, bathrooms, maid_room';
COMMENT ON COLUMN properties.payment_facilities IS 'Whether the property has payment facilities';
COMMENT ON COLUMN properties.payment_facilities_specification IS 'Specification text for payment facilities when enabled';

