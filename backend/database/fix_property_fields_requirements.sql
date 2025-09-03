-- Migration: Fix property fields requirements according to specifications
-- This migration ensures the correct fields are required vs optional

-- REQUIRED FIELDS (should have NOT NULL):
-- - status_id (already NOT NULL ✓)
-- - property_type (already NOT NULL ✓) 
-- - category_id (already NOT NULL ✓)
-- - location (already NOT NULL ✓)
-- - owner_name (already NOT NULL ✓)
-- - phone_number (already NOT NULL ✓)
-- - surface (already NOT NULL ✓)
-- - view_type (already NOT NULL ✓)
-- - price (already NOT NULL ✓)
-- - concierge (already NOT NULL ✓)
-- - details (already NOT NULL ✓)
-- - interior_details (already NOT NULL ✓)

-- OPTIONAL FIELDS (should NOT have NOT NULL):
-- - building_name (already optional ✓)
-- - built_year (already optional ✓)
-- - agent_id (currently NOT NULL, needs to be made optional)
-- - notes (already optional ✓)
-- - main_image (already optional ✓)
-- - image_gallery (already optional ✓)

-- Make agent_id optional (remove NOT NULL constraint)
ALTER TABLE properties ALTER COLUMN agent_id DROP NOT NULL;

-- Verify the changes
-- The agent_id column should now allow NULL values
-- You can check with: \d properties

-- Summary of field requirements after this migration:
-- REQUIRED (NOT NULL): status_id, property_type, category_id, location, owner_name, 
--                      phone_number, surface, view_type, price, concierge, details, interior_details
-- OPTIONAL (NULL allowed): building_name, built_year, agent_id, notes, main_image, image_gallery
