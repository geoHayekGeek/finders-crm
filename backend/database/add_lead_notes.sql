-- Lead notes feature: scoped notes per lead with role-based visibility

CREATE TABLE IF NOT EXISTS lead_notes (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_role VARCHAR(50) NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_by ON lead_notes(created_by);

COMMENT ON TABLE lead_notes IS 'Per-lead notes with author and role metadata, used for scoped visibility by role';
COMMENT ON COLUMN lead_notes.lead_id IS 'Lead this note belongs to';
COMMENT ON COLUMN lead_notes.created_by IS 'User who created the note';
COMMENT ON COLUMN lead_notes.created_by_role IS 'Role of the user at the time the note was created';
COMMENT ON COLUMN lead_notes.note_text IS 'Free-form note text';


