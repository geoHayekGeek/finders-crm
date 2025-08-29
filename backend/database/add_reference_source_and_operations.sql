-- Add reference_source and operations columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reference_source_id INTEGER REFERENCES reference_sources(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS operations_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_leads_reference_source_id ON leads(reference_source_id);
CREATE INDEX IF NOT EXISTS idx_leads_operations_id ON leads(operations_id);

-- Add comments to clarify the difference between referral_source and reference_source
COMMENT ON COLUMN leads.referral_source IS 'Referral from a person (agent, client, etc.)';
COMMENT ON COLUMN leads.reference_source_id IS 'Marketing channel source (Facebook, Instagram, Website, etc.)';
COMMENT ON COLUMN leads.operations_id IS 'Operations employee or manager assigned to this lead';
