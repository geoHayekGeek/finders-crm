-- Create reference_sources table
CREATE TABLE IF NOT EXISTS reference_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reference_sources_name ON reference_sources(source_name);
CREATE INDEX IF NOT EXISTS idx_reference_sources_created_at ON reference_sources(created_at);

-- Create trigger to update modified_at timestamp
CREATE OR REPLACE FUNCTION update_reference_sources_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_reference_sources_modified_at
    BEFORE UPDATE ON reference_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_reference_sources_modified_at();

-- Insert predefined reference sources
INSERT INTO reference_sources (source_name) VALUES
    ('Facebook'),
    ('Instagram'),
    ('Website'),
    ('Tiktok'),
    ('Dubizzle'),
    ('External')
ON CONFLICT (source_name) DO NOTHING;
