-- Migration: Add owner_id to properties and link to leads
-- This migration changes properties to reference leads as owners instead of using owner_name

-- Step 1: Add owner_id column as nullable initially
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES leads(id) ON DELETE SET NULL;

-- Step 2: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);

-- Step 3: Make owner_name and phone_number optional (since they'll be from leads)
ALTER TABLE properties ALTER COLUMN owner_name DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN phone_number DROP NOT NULL;

-- Step 4: Add a comment to document the change
COMMENT ON COLUMN properties.owner_id IS 'Foreign key to leads table - the customer (buyer/seller) who owns this property';
COMMENT ON COLUMN properties.owner_name IS 'DEPRECATED: Use owner_id to reference leads table. Kept for backward compatibility';
COMMENT ON COLUMN properties.phone_number IS 'DEPRECATED: Use owner_id to reference leads table. Kept for backward compatibility';

-- Note: We keep owner_name and phone_number for backward compatibility
-- New properties should use owner_id to link to a lead
-- Old properties can continue to use owner_name until migrated

