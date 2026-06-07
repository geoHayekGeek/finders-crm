-- Migration: Add is_default_status column to statuses table
-- Date: 2026-06-07
-- Description: Marks one active property status as the default status used when creating new properties

ALTER TABLE statuses
ADD COLUMN IF NOT EXISTS is_default_status BOOLEAN DEFAULT FALSE;

ALTER TABLE statuses
ALTER COLUMN is_default_status SET DEFAULT FALSE;

UPDATE statuses
SET is_default_status = FALSE
WHERE is_default_status IS NULL;

WITH named_active AS (
  SELECT id
  FROM statuses
  WHERE LOWER(code) = 'active'
     OR LOWER(name) = 'active'
  ORDER BY id ASC
  LIMIT 1
),
first_active AS (
  SELECT id
  FROM statuses
  WHERE is_active = TRUE
  ORDER BY id ASC
  LIMIT 1
),
first_any AS (
  SELECT id
  FROM statuses
  ORDER BY id ASC
  LIMIT 1
),
chosen AS (
  SELECT id FROM named_active
  UNION ALL
  SELECT id FROM first_active
  WHERE NOT EXISTS (SELECT 1 FROM named_active)
  UNION ALL
  SELECT id FROM first_any
  WHERE NOT EXISTS (SELECT 1 FROM named_active)
    AND NOT EXISTS (SELECT 1 FROM first_active)
  LIMIT 1
)
UPDATE statuses
SET is_default_status = CASE WHEN id = (SELECT id FROM chosen) THEN TRUE ELSE FALSE END
WHERE EXISTS (SELECT 1 FROM chosen);

ALTER TABLE statuses
ALTER COLUMN is_default_status SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_statuses_single_default
  ON statuses ((is_default_status))
  WHERE is_default_status = TRUE;

COMMENT ON COLUMN statuses.is_default_status IS 'Indicates the property status that should be preselected when creating a new property. Only one active status should be marked as default.';
