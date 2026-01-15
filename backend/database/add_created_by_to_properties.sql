-- Migration: Add created_by column to properties table
-- This tracks who added/created each property

-- Add created_by column
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);

-- Add comment
COMMENT ON COLUMN properties.created_by IS 'User who added/created this property';

-- For existing properties without created_by, we can't retroactively determine who created them
-- They will remain NULL, but new properties will have this field set
