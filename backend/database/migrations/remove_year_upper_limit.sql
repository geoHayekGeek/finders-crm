-- Migration: Remove upper year limit (2100) from report tables
-- This allows reports to be created for any future date

-- Update DCSR reports table
ALTER TABLE dcsr_monthly_reports 
  DROP CONSTRAINT IF EXISTS dcsr_monthly_reports_year_check;

ALTER TABLE dcsr_monthly_reports 
  ADD CONSTRAINT dcsr_monthly_reports_year_check 
  CHECK (year >= 2020);

-- Update monthly agent reports table
ALTER TABLE monthly_agent_reports 
  DROP CONSTRAINT IF EXISTS monthly_agent_reports_year_check;

ALTER TABLE monthly_agent_reports 
  ADD CONSTRAINT monthly_agent_reports_year_check 
  CHECK (year >= 2000);

-- Update operations commission reports table
ALTER TABLE operations_commission_reports 
  DROP CONSTRAINT IF EXISTS operations_commission_reports_year_check;

ALTER TABLE operations_commission_reports 
  ADD CONSTRAINT operations_commission_reports_year_check 
  CHECK (year >= 2000);

