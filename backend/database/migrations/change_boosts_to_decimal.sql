-- Migration: Change boosts column from INTEGER to DECIMAL
-- Date: 2025-01-XX
-- Description: Changes boosts column to DECIMAL(15,2) to support dollar values

-- Change boosts column type from INTEGER to DECIMAL(15,2)
ALTER TABLE monthly_agent_reports 
ALTER COLUMN boosts TYPE DECIMAL(15,2) USING boosts::DECIMAL(15,2);

-- Update default value to 0.00
ALTER TABLE monthly_agent_reports 
ALTER COLUMN boosts SET DEFAULT 0.00;

-- Update comment to reflect that it's a dollar value
COMMENT ON COLUMN monthly_agent_reports.boosts IS 'Manual field for boosts in dollars (can be edited)';

