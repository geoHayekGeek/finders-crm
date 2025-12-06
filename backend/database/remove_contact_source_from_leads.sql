-- Remove contact_source column from leads table
-- This script removes the contact_source column and its associated index

-- Drop the index first
DROP INDEX IF EXISTS idx_leads_contact_source;

-- Remove the contact_source column
ALTER TABLE leads DROP COLUMN IF EXISTS contact_source CASCADE;



