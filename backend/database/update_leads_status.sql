-- Add status_id column to leads table (referencing lead_statuses table)
-- This will replace the current string-based status field

-- First, add the new status_id column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_id INTEGER REFERENCES lead_statuses(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON leads(status_id);

-- Update existing leads to map their current status to the new status_id
-- Note: This assumes the lead_statuses table has been created and populated

UPDATE leads 
SET status_id = (
    SELECT id 
    FROM lead_statuses 
    WHERE LOWER(status_name) = LOWER(leads.status)
)
WHERE status_id IS NULL AND status IS NOT NULL;

-- For any leads that don't match, set them to 'Active' (id = 1)
UPDATE leads 
SET status_id = (SELECT id FROM lead_statuses WHERE status_name = 'Active')
WHERE status_id IS NULL;

-- Add comment
COMMENT ON COLUMN leads.status_id IS 'Foreign key reference to lead_statuses table';

-- Note: We'll keep the old 'status' column for now for backward compatibility
-- It can be removed in a future migration once we're sure everything works
