-- Remove legacy lead notes structures

ALTER TABLE leads
  DROP COLUMN IF EXISTS notes;

DROP TABLE IF EXISTS lead_notes CASCADE;

