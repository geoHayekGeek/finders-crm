-- Migration: Add external field to referrals tables
-- Date: 2025-10-19
-- Description: Adds boolean 'external' column to track commission eligibility for referrals

-- Add external field to property referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN referrals.external IS 'Indicates whether the referral is external (no longer earns commission). Set to true when a property is re-referred to another agent after 1 month.';

-- Create index for filtering external/internal referrals
CREATE INDEX IF NOT EXISTS idx_referrals_external ON referrals(external);


