-- Create viewings table
-- Viewings track property showings to potential buyers (leads)
CREATE TABLE IF NOT EXISTS viewings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewing_date DATE NOT NULL,
  viewing_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Add constraints
  CONSTRAINT viewing_date_not_future CHECK (viewing_date <= CURRENT_DATE + INTERVAL '1 year'),
  CONSTRAINT valid_status CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No Show', 'Rescheduled'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_viewings_property_id ON viewings(property_id);
CREATE INDEX IF NOT EXISTS idx_viewings_lead_id ON viewings(lead_id);
CREATE INDEX IF NOT EXISTS idx_viewings_agent_id ON viewings(agent_id);
CREATE INDEX IF NOT EXISTS idx_viewings_viewing_date ON viewings(viewing_date);
CREATE INDEX IF NOT EXISTS idx_viewings_status ON viewings(status);
CREATE INDEX IF NOT EXISTS idx_viewings_created_at ON viewings(created_at);

-- Create viewing_updates table for tracking viewing updates/history
CREATE TABLE IF NOT EXISTS viewing_updates (
  id SERIAL PRIMARY KEY,
  viewing_id INTEGER NOT NULL REFERENCES viewings(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Add constraints
  CONSTRAINT update_text_not_empty CHECK (TRIM(update_text) <> ''),
  CONSTRAINT update_date_not_future CHECK (update_date <= CURRENT_DATE)
);

-- Create indexes for viewing_updates
CREATE INDEX IF NOT EXISTS idx_viewing_updates_viewing_id ON viewing_updates(viewing_id);
CREATE INDEX IF NOT EXISTS idx_viewing_updates_created_by ON viewing_updates(created_by);
CREATE INDEX IF NOT EXISTS idx_viewing_updates_update_date ON viewing_updates(update_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_viewings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_viewings_timestamp
BEFORE UPDATE ON viewings
FOR EACH ROW
EXECUTE FUNCTION update_viewings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE viewings IS 'Stores property viewing appointments between agents, leads, and properties';
COMMENT ON TABLE viewing_updates IS 'Stores updates and notes about viewings with timestamps';
COMMENT ON COLUMN viewings.property_id IS 'Reference to the property being viewed';
COMMENT ON COLUMN viewings.lead_id IS 'Reference to the lead (potential buyer) viewing the property';
COMMENT ON COLUMN viewings.agent_id IS 'Reference to the agent conducting the viewing';
COMMENT ON COLUMN viewings.viewing_date IS 'Date of the viewing appointment';
COMMENT ON COLUMN viewings.viewing_time IS 'Time of the viewing appointment';
COMMENT ON COLUMN viewings.status IS 'Current status of the viewing (Scheduled, Completed, Cancelled, No Show, Rescheduled)';
COMMENT ON COLUMN viewing_updates.update_text IS 'Text content of the update/note';
COMMENT ON COLUMN viewing_updates.update_date IS 'Date when the update was made (user-specified)';
COMMENT ON COLUMN viewing_updates.created_by IS 'User who created this update';

