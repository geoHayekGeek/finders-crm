-- Migration: Add can_be_referred column to statuses table
-- Date: 2025-01-XX
-- Description: Adds can_be_referred boolean field to control whether properties with this status can be referred

-- Add the can_be_referred column with default TRUE for backward compatibility
ALTER TABLE statuses 
ADD COLUMN IF NOT EXISTS can_be_referred BOOLEAN DEFAULT TRUE NOT NULL;

-- Update existing statuses: Set can_be_referred to FALSE for 'sold', 'rented', and 'closed' statuses
UPDATE statuses 
SET can_be_referred = FALSE 
WHERE LOWER(code) IN ('sold', 'rented', 'closed') 
   OR LOWER(name) IN ('sold', 'rented', 'closed');

-- Add a comment to document the column
COMMENT ON COLUMN statuses.can_be_referred IS 'Indicates whether properties with this status can be referred to other agents. Defaults to TRUE.';

