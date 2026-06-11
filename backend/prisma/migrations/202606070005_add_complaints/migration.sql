-- Migration: add complaints table
-- Date: 2026-06-07
-- Description: Stores complaints filed against agents, consultants, and team leaders

CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_lead_id
  ON complaints(lead_id);

CREATE INDEX IF NOT EXISTS idx_complaints_target_user_id
  ON complaints(target_user_id);

CREATE INDEX IF NOT EXISTS idx_complaints_created_by
  ON complaints(created_by);

CREATE INDEX IF NOT EXISTS idx_complaints_created_at
  ON complaints(created_at DESC);

CREATE OR REPLACE FUNCTION update_complaints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_complaints_updated_at ON complaints;
CREATE TRIGGER trg_update_complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_complaints_updated_at();

COMMENT ON TABLE complaints IS 'Complaints filed by operations, HR, admin, and team leaders against agents, consultants, or team leaders.';
