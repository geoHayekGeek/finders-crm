-- Add property and lead associations to calendar_events table
-- This migration adds optional foreign key references to properties and leads

-- Add property_id column with foreign key constraint
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;

-- Add lead_id column with foreign key constraint
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_property_id ON calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id ON calendar_events(lead_id);

-- Add comments to document the columns
COMMENT ON COLUMN calendar_events.property_id IS 'Optional reference to a property this event is related to';
COMMENT ON COLUMN calendar_events.lead_id IS 'Optional reference to a lead this event is related to';

-- Add constraint to ensure an event is not linked to both property and lead simultaneously
-- (Optional - you can remove this if you want to allow both)
-- ALTER TABLE calendar_events 
-- ADD CONSTRAINT chk_calendar_events_single_link 
-- CHECK (NOT (property_id IS NOT NULL AND lead_id IS NOT NULL));
