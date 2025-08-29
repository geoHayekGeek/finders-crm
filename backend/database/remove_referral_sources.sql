-- Remove referral source fields from leads table
-- This script removes referral_source, referral_dates, and referral_sources columns
-- while keeping reference_source_id (which is the dropdown for Facebook, Instagram, etc.)

-- Remove referral source columns from leads table
ALTER TABLE leads DROP COLUMN IF EXISTS referral_source CASCADE;
ALTER TABLE leads DROP COLUMN IF EXISTS referral_dates CASCADE;
ALTER TABLE leads DROP COLUMN IF EXISTS referral_sources CASCADE;

-- Remove referral source columns from properties table
ALTER TABLE properties DROP COLUMN IF EXISTS referral_source CASCADE;
ALTER TABLE properties DROP COLUMN IF EXISTS referral_dates CASCADE;
ALTER TABLE properties DROP COLUMN IF EXISTS referral_sources CASCADE;

-- Drop the index for referral_sources if it exists
DROP INDEX IF EXISTS idx_properties_referral_sources;

-- Update comments to clarify what remains
COMMENT ON COLUMN leads.reference_source_id IS 'Marketing channel source (Facebook, Instagram, Website, etc.) - the only referral-related field we keep';

-- Confirm what columns remain in leads table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Confirm what columns remain in properties table  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'properties'
AND table_schema = 'public'
ORDER BY ordinal_position;
