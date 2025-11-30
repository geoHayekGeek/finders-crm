-- Migration: Convert property details from TEXT to JSONB and add structured fields
-- Also add payment_facilities field

-- Step 1: Add new columns for structured data (temporary, will replace old ones)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS details_new JSONB,
ADD COLUMN IF NOT EXISTS interior_details_new JSONB,
ADD COLUMN IF NOT EXISTS payment_facilities BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_facilities_specification TEXT;

-- Step 2: Migrate existing TEXT data to JSONB structure
-- For details: Try to parse as JSON, otherwise create structured object from text
UPDATE properties 
SET details_new = CASE
  WHEN details::text ~ '^\{.*\}$' THEN details::jsonb  -- Already JSON
  ELSE jsonb_build_object(
    'floor_number', COALESCE((details::jsonb->>'floor_number'), ''),
    'balcony', COALESCE((details::jsonb->>'balcony'), ''),
    'covered_parking', COALESCE((details::jsonb->>'covered_parking'), ''),
    'outdoor_parking', COALESCE((details::jsonb->>'outdoor_parking'), ''),
    'cave', COALESCE((details::jsonb->>'cave'), '')
  )
END
WHERE details IS NOT NULL;

-- For interior_details: Create structured object
UPDATE properties 
SET interior_details_new = jsonb_build_object(
  'living_rooms', COALESCE((interior_details::jsonb->>'living_rooms'), ''),
  'bedrooms', COALESCE((interior_details::jsonb->>'bedrooms'), ''),
  'bathrooms', COALESCE((interior_details::jsonb->>'bathrooms'), ''),
  'maid_room', COALESCE((interior_details::jsonb->>'maid_room'), '')
)
WHERE interior_details IS NOT NULL;

-- Step 3: Drop old columns and rename new ones
ALTER TABLE properties 
DROP COLUMN IF EXISTS details,
DROP COLUMN IF EXISTS interior_details;

ALTER TABLE properties 
RENAME COLUMN details_new TO details;

ALTER TABLE properties 
RENAME COLUMN interior_details_new TO interior_details;

-- Step 4: Set NOT NULL constraint on new JSONB columns (with default empty objects)
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

-- Step 5: Add comments for documentation
COMMENT ON COLUMN properties.details IS 'Structured property details: floor_number, balcony, covered_parking, outdoor_parking, cave';
COMMENT ON COLUMN properties.interior_details IS 'Structured interior details: living_rooms, bedrooms, bathrooms, maid_room';
COMMENT ON COLUMN properties.payment_facilities IS 'Whether the property has payment facilities';
COMMENT ON COLUMN properties.payment_facilities_specification IS 'Specification text for payment facilities when enabled';

