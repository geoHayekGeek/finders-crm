-- Migration: Make operations_id required (NOT NULL) in leads table
-- This ensures every lead must have an operations staff assigned

-- Step 1: Find the first available operations user to use as default for existing NULL values
-- We'll use the first operations or operations_manager user we find
DO $$
DECLARE
    default_operations_id INTEGER;
    leads_without_operations INTEGER;
BEGIN
    -- Find the first operations user
    SELECT id INTO default_operations_id
    FROM users
    WHERE role IN ('operations', 'operations_manager')
    ORDER BY id
    LIMIT 1;
    
    -- Count leads without operations
    SELECT COUNT(*) INTO leads_without_operations
    FROM leads
    WHERE operations_id IS NULL;
    
    -- If we found an operations user and there are leads without operations, update them
    IF default_operations_id IS NOT NULL AND leads_without_operations > 0 THEN
        RAISE NOTICE 'Found % leads without operations_id. Setting default operations_id to %', leads_without_operations, default_operations_id;
        
        UPDATE leads
        SET operations_id = default_operations_id
        WHERE operations_id IS NULL;
        
        RAISE NOTICE 'Updated % leads with default operations_id', leads_without_operations;
    ELSIF default_operations_id IS NULL THEN
        RAISE WARNING 'No operations user found! Cannot set default for existing leads. Please create an operations user first.';
    END IF;
END $$;

-- Step 2: Add NOT NULL constraint to operations_id
-- First, we need to drop the existing foreign key constraint to modify the column
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_operations_id_fkey;

-- Now add the NOT NULL constraint
ALTER TABLE leads 
ALTER COLUMN operations_id SET NOT NULL;

-- Re-add the foreign key constraint with NOT NULL
ALTER TABLE leads 
ADD CONSTRAINT leads_operations_id_fkey 
FOREIGN KEY (operations_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Add comment to document the requirement
COMMENT ON COLUMN leads.operations_id IS 'Operations employee or manager assigned to this lead (REQUIRED)';

-- Verify the constraint
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM leads
    WHERE operations_id IS NULL;
    
    IF null_count > 0 THEN
        RAISE WARNING 'Warning: % leads still have NULL operations_id', null_count;
    ELSE
        RAISE NOTICE 'Success: All leads have operations_id set';
    END IF;
END $$;

