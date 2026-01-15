-- Migration: Rename operations_id to added_by_id in leads table
-- This changes the field to represent the person who added the lead, not just operations staff

-- Step 1: Rename the column
ALTER TABLE leads 
RENAME COLUMN operations_id TO added_by_id;

-- Step 2: Update the foreign key constraint name
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_operations_id_fkey;

ALTER TABLE leads 
ADD CONSTRAINT leads_added_by_id_fkey 
FOREIGN KEY (added_by_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Step 3: Update the index name
DROP INDEX IF EXISTS idx_leads_operations_id;
CREATE INDEX IF NOT EXISTS idx_leads_added_by_id ON leads(added_by_id);

-- Step 4: Update the comment
COMMENT ON COLUMN leads.added_by_id IS 'User who added/created this lead (REQUIRED)';

-- Step 5: Verify the constraint
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM leads
    WHERE added_by_id IS NULL;
    
    IF null_count > 0 THEN
        RAISE WARNING 'Warning: % leads still have NULL added_by_id', null_count;
    ELSE
        RAISE NOTICE 'Success: All leads have added_by_id set';
    END IF;
END $$;
