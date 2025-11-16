-- Add enhancements to viewings system for property-embedded viewings
-- This migration adds:
-- 1. is_serious flag to viewings
-- 2. description field to viewings
-- 3. status field to viewing_updates

-- Add is_serious column to viewings table
ALTER TABLE viewings 
ADD COLUMN IF NOT EXISTS is_serious BOOLEAN DEFAULT FALSE NOT NULL;

-- Add description column to viewings table (separate from notes)
ALTER TABLE viewings 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add status column to viewing_updates table
ALTER TABLE viewing_updates 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Initial Contact';

-- Create index for is_serious for better query performance
CREATE INDEX IF NOT EXISTS idx_viewings_is_serious ON viewings(is_serious);

-- Create index for viewing_updates status
CREATE INDEX IF NOT EXISTS idx_viewing_updates_status ON viewing_updates(status);

-- Add constraint for valid update statuses
ALTER TABLE viewing_updates 
DROP CONSTRAINT IF EXISTS valid_update_status;

ALTER TABLE viewing_updates 
ADD CONSTRAINT valid_update_status 
CHECK (status IN (
  'Initial Contact',
  'Follow-up Scheduled',
  'Negotiation',
  'Documentation',
  'Near Closure',
  'Closed Won',
  'Closed Lost',
  'On Hold'
));

-- Update comments for documentation
COMMENT ON COLUMN viewings.is_serious IS 'Flag to indicate if this is a serious/high-priority viewing';
COMMENT ON COLUMN viewings.description IS 'Detailed description of the viewing context and requirements';
COMMENT ON COLUMN viewing_updates.status IS 'Current stage/status of the viewing process (Initial Contact, Follow-up Scheduled, Negotiation, Documentation, Near Closure, Closed Won, Closed Lost, On Hold)';

-- Create a view for property viewings with all details
CREATE OR REPLACE VIEW property_viewings_detailed AS
SELECT 
  v.id,
  v.property_id,
  v.lead_id,
  v.agent_id,
  v.viewing_date,
  v.viewing_time,
  v.status,
  v.is_serious,
  v.description,
  v.notes,
  v.created_at,
  v.updated_at,
  -- Property details
  p.reference_number as property_reference,
  p.location as property_location,
  p.property_type,
  -- Lead details
  l.customer_name as lead_name,
  l.phone_number as lead_phone,
  -- Agent details
  u.name as agent_name,
  u.role as agent_role,
  -- Count of updates
  (SELECT COUNT(*) FROM viewing_updates vu WHERE vu.viewing_id = v.id) as updates_count,
  -- Latest update status
  (SELECT vu.status FROM viewing_updates vu WHERE vu.viewing_id = v.id ORDER BY vu.created_at DESC LIMIT 1) as latest_update_status,
  -- Latest update date
  (SELECT vu.update_date FROM viewing_updates vu WHERE vu.viewing_id = v.id ORDER BY vu.created_at DESC LIMIT 1) as latest_update_date
FROM viewings v
LEFT JOIN properties p ON v.property_id = p.id
LEFT JOIN leads l ON v.lead_id = l.id
LEFT JOIN users u ON v.agent_id = u.id
ORDER BY v.is_serious DESC, v.viewing_date DESC;

COMMENT ON VIEW property_viewings_detailed IS 'Comprehensive view of viewings with property, lead, and agent details, ordered by priority (serious first)';

-- Function to get viewings for a specific property
CREATE OR REPLACE FUNCTION get_property_viewings(p_property_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  property_id INTEGER,
  lead_id INTEGER,
  lead_name VARCHAR,
  lead_phone VARCHAR,
  agent_id INTEGER,
  agent_name VARCHAR,
  viewing_date DATE,
  viewing_time TIME,
  status VARCHAR,
  is_serious BOOLEAN,
  description TEXT,
  notes TEXT,
  updates_count BIGINT,
  latest_update_status VARCHAR,
  latest_update_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.property_id,
    v.lead_id,
    l.customer_name as lead_name,
    l.phone_number as lead_phone,
    v.agent_id,
    u.name as agent_name,
    v.viewing_date,
    v.viewing_time,
    v.status,
    v.is_serious,
    v.description,
    v.notes,
    (SELECT COUNT(*) FROM viewing_updates vu WHERE vu.viewing_id = v.id) as updates_count,
    (SELECT vu.status FROM viewing_updates vu WHERE vu.viewing_id = v.id ORDER BY vu.created_at DESC LIMIT 1) as latest_update_status,
    (SELECT vu.update_date FROM viewing_updates vu WHERE vu.viewing_id = v.id ORDER BY vu.created_at DESC LIMIT 1) as latest_update_date,
    v.created_at,
    v.updated_at
  FROM viewings v
  LEFT JOIN leads l ON v.lead_id = l.id
  LEFT JOIN users u ON v.agent_id = u.id
  WHERE v.property_id = p_property_id
  ORDER BY v.is_serious DESC, v.viewing_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_property_viewings IS 'Get all viewings for a specific property, ordered by priority (serious first) then date';

