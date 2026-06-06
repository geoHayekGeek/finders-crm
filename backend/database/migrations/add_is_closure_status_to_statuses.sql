-- Migration: add is_closure_status flag to property statuses
-- This flag becomes the source of truth for whether a property status means the property is closed.

ALTER TABLE statuses
ADD COLUMN IF NOT EXISTS is_closure_status BOOLEAN DEFAULT FALSE;

UPDATE statuses
SET is_closure_status = FALSE
WHERE is_closure_status IS NULL;

UPDATE statuses
SET is_closure_status = TRUE
WHERE LOWER(code) IN ('sold', 'rented', 'closed')
   OR LOWER(name) IN ('sold', 'rented', 'closed');

ALTER TABLE statuses
ALTER COLUMN is_closure_status SET DEFAULT FALSE;

ALTER TABLE statuses
ALTER COLUMN is_closure_status SET NOT NULL;

COMMENT ON COLUMN statuses.is_closure_status IS
'Indicates whether this status means the property is closed. Used for closed_date behavior, reporting, and commissions.';
