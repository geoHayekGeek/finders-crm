-- Add referrals-on-properties columns to monthly_agent_reports
-- Keeps the stored schema aligned with the report model and export views.

ALTER TABLE monthly_agent_reports
  ADD COLUMN IF NOT EXISTS referrals_on_properties_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrals_on_properties_commission DECIMAL(15,2) DEFAULT 0;
