-- Migration: Add referral_sources column to properties table
-- Date: 2024-01-22
-- Description: Adds JSONB column to store multiple referrals with dates

-- Add the new referral_sources column
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS referral_sources JSONB;

-- Add a comment to document the column structure
COMMENT ON COLUMN properties.referral_sources IS 'Array of referral objects with source and date: [{"source": "John Doe", "date": "2024-01-15"}, {"source": "External Agency", "date": "2024-01-20"}]';

-- Optionally, create an index on the referral_sources column for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_referral_sources ON properties USING GIN(referral_sources);

-- Update existing records to migrate data from old format to new format (if needed)
-- This will convert single referral_source to the new array format
UPDATE properties 
SET referral_sources = jsonb_build_array(
  jsonb_build_object(
    'source', referral_source,
    'date', CASE 
      WHEN referral_dates IS NOT NULL AND array_length(referral_dates, 1) > 0 
      THEN referral_dates[1]::text 
      ELSE CURRENT_DATE::text 
    END,
    'isCustom', true
  )
)
WHERE referral_source IS NOT NULL 
  AND referral_source != '' 
  AND (referral_sources IS NULL OR referral_sources = 'null'::jsonb);
