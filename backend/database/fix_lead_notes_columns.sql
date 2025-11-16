-- Ensure lead_notes table has the expected columns used by the application

ALTER TABLE lead_notes
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50) NOT NULL DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS note_text TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Older schemas had an agent_id column that was NOT NULL; relax that so we
-- can rely on created_by/created_by_role instead.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'lead_notes'
      AND column_name = 'agent_id'
  ) THEN
    ALTER TABLE lead_notes
      ALTER COLUMN agent_id DROP NOT NULL;
  END IF;
END $$;

-- Ensure each user can only have one note per lead
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_notes_unique_per_user
  ON lead_notes(lead_id, created_by);


