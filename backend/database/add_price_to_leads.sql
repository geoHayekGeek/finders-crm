-- Migration: Add price field to leads table
-- This adds an optional price field to track the potential value of leads

-- Add price column (optional, decimal with 2 decimal places)
ALTER TABLE leads 
ADD COLUMN price DECIMAL(15,2) NULL;

-- Add comment to document the field
COMMENT ON COLUMN leads.price IS 'Optional price/value of the lead in the system currency';

-- Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;
