-- Migration: Make optional fields actually optional in properties table
-- This removes NOT NULL constraints from fields that should be optional

-- Make phone_number optional (was NOT NULL)
ALTER TABLE properties ALTER COLUMN phone_number DROP NOT NULL;

-- Make interior_details optional (was NOT NULL) 
ALTER TABLE properties ALTER COLUMN interior_details DROP NOT NULL;

-- Make details optional (was NOT NULL)
ALTER TABLE properties ALTER COLUMN details DROP NOT NULL;

-- Make surface optional (was NOT NULL)
ALTER TABLE properties ALTER COLUMN surface DROP NOT NULL;

-- Make view_type optional (was NOT NULL)
ALTER TABLE properties ALTER COLUMN view_type DROP NOT NULL;

-- Make agent_id optional (was NOT NULL)
ALTER TABLE properties ALTER COLUMN agent_id DROP NOT NULL;

-- Verify the changes
-- You can check the table structure with: \d properties
-- The following columns should now allow NULL values:
-- - phone_number
-- - interior_details  
-- - details
-- - surface
-- - view_type
-- - agent_id
