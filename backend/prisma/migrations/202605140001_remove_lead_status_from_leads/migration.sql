-- Leads do not carry lifecycle statuses in this system.
-- Remove the legacy status column and dependent legacy view/index.

DROP VIEW IF EXISTS leads_with_referrals;
DROP INDEX IF EXISTS idx_leads_status;

ALTER TABLE leads
DROP COLUMN IF EXISTS status;
