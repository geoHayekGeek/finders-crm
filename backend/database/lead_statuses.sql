-- Create lead_statuses table
CREATE TABLE IF NOT EXISTS lead_statuses (
    id SERIAL PRIMARY KEY,
    status_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on status_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_statuses_status_name ON lead_statuses(status_name);

-- Create function to update modified_at timestamp
CREATE OR REPLACE FUNCTION update_lead_statuses_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update modified_at
DROP TRIGGER IF EXISTS update_lead_statuses_modified_at_trigger ON lead_statuses;
CREATE TRIGGER update_lead_statuses_modified_at_trigger
    BEFORE UPDATE ON lead_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_statuses_modified_at();

-- Insert default lead statuses
INSERT INTO lead_statuses (status_name) VALUES
    ('Active'),
    ('Contacted'),
    ('Qualified'),
    ('Converted'),
    ('Closed')
ON CONFLICT (status_name) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE lead_statuses IS 'Stores lead status options with timestamps';
COMMENT ON COLUMN lead_statuses.status_name IS 'Name of the lead status (Active, Contacted, etc.)';
COMMENT ON COLUMN lead_statuses.created_at IS 'When this status was created';
COMMENT ON COLUMN lead_statuses.modified_at IS 'When this status was last modified';
