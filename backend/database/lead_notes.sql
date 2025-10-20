-- Lead Notes table for agent-specific notes
-- Each agent can have their own notes on a lead
-- Notes persist even when lead is reassigned

CREATE TABLE IF NOT EXISTS lead_notes (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one note record per agent per lead
    UNIQUE(lead_id, agent_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_agent_id ON lead_notes(agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_lead_notes_updated_at
    BEFORE UPDATE ON lead_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_notes_updated_at();

-- Add comment to document the table
COMMENT ON TABLE lead_notes IS 'Agent-specific notes for leads. Each agent maintains their own notes that persist even when the lead is reassigned.';
COMMENT ON COLUMN lead_notes.lead_id IS 'Foreign key to leads table';
COMMENT ON COLUMN lead_notes.agent_id IS 'Foreign key to users table - the agent who wrote the note';
COMMENT ON COLUMN lead_notes.note_text IS 'The note content written by the agent';

