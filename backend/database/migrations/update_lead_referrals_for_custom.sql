-- Migration: Update lead_referrals table to support custom referrals
-- Date: 2025-10-19
-- Description: Adds name and type fields to support both employee and custom referrals, just like properties

-- Add name column (will store agent name or custom name)
ALTER TABLE lead_referrals 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add type column (employee or custom)
ALTER TABLE lead_referrals 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'employee' CHECK (type IN ('employee', 'custom'));

-- Update existing records to set name from users table and type to 'employee'
UPDATE lead_referrals lr
SET 
  name = u.name,
  type = 'employee'
FROM users u
WHERE lr.agent_id = u.id
  AND lr.name IS NULL;

-- Make name NOT NULL after populating existing records
ALTER TABLE lead_referrals 
ALTER COLUMN name SET NOT NULL;

-- Update the unique constraint to allow multiple referrals of the same agent
-- (because we might have custom referrals with same name at different times)
ALTER TABLE lead_referrals 
DROP CONSTRAINT IF EXISTS lead_referrals_lead_id_agent_id_key;

-- Add index on type for filtering
CREATE INDEX IF NOT EXISTS idx_lead_referrals_type ON lead_referrals(type);

-- Add comments
COMMENT ON COLUMN lead_referrals.name IS 'Name of the referrer (agent name or custom name)';
COMMENT ON COLUMN lead_referrals.type IS 'Type of referral: employee (agent) or custom (external person)';


