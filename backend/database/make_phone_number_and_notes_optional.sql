-- Migration: Make phone_number and notes fields optional in properties table
-- This removes the NOT NULL constraint from the phone_number field only
-- Notes is already optional in the schema

-- Make phone_number optional (was NOT NULL)
ALTER TABLE properties ALTER COLUMN phone_number DROP NOT NULL;

-- Verify the change
-- The phone_number column should now allow NULL values
-- You can check with: \d properties

-- Note: The following fields remain REQUIRED (NOT NULL):
-- - reference_number
-- - status_id  
-- - property_type
-- - location
-- - category_id
-- - owner_name
-- - surface
-- - details
-- - interior_details
-- - view_type
-- - concierge
-- - agent_id
-- - price

-- The following fields are already OPTIONAL:
-- - building_name
-- - built_year
-- - notes
-- - referral_sources
-- - main_image
-- - image_gallery
