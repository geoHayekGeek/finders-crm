-- Add can_be_referred column to lead_statuses table
-- This column determines whether a lead with this status can be referred to another agent

ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS can_be_referred BOOLEAN DEFAULT TRUE NOT NULL;

-- Update existing statuses: Closed and Converted should not be referrable by default
UPDATE lead_statuses 
SET can_be_referred = FALSE 
WHERE LOWER(status_name) IN ('closed', 'converted');

-- Add comment
COMMENT ON COLUMN lead_statuses.can_be_referred IS 'Whether leads with this status can be referred to other agents';

