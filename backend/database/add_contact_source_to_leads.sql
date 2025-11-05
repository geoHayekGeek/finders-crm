-- Add contact_source column to leads table
-- This field tracks how the lead was initially contacted (call, unknown)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS contact_source VARCHAR(50) DEFAULT 'unknown' CHECK (contact_source IN ('call', 'unknown'));

-- Add comment to document the field
COMMENT ON COLUMN leads.contact_source IS 'How the lead was initially contacted: call or unknown';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_contact_source ON leads(contact_source);

-- Update existing records to have 'unknown' as default if NULL
UPDATE leads SET contact_source = 'unknown' WHERE contact_source IS NULL;

