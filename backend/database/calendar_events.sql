-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  color VARCHAR(50) DEFAULT 'blue',
  type VARCHAR(100) DEFAULT 'other',
  location TEXT,
  attendees TEXT[], -- Array of user IDs or names
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned_to ON calendar_events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_events_property_id ON calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id ON calendar_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at 
  BEFORE UPDATE ON calendar_events 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get users who should be notified for calendar event changes
CREATE OR REPLACE FUNCTION get_calendar_event_notification_users(
  event_id INTEGER,
  exclude_user_id INTEGER DEFAULT NULL
)
RETURNS TABLE(user_id INTEGER, user_name VARCHAR, user_role VARCHAR) AS $$
BEGIN
  RETURN QUERY
  WITH event_info AS (
    SELECT 
      ce.id,
      ce.title,
      ce.assigned_to,
      ce.created_by,
      ce.property_id,
      ce.lead_id,
      ce.start_time,
      ce.end_time
    FROM calendar_events ce
    WHERE ce.id = event_id
  ),
  -- Get users based on event assignment and creation
  assigned_users AS (
    SELECT DISTINCT u.id, u.name, u.role
    FROM event_info ei
    JOIN users u ON u.id = ei.assigned_to
    WHERE ei.assigned_to IS NOT NULL
      AND (exclude_user_id IS NULL OR u.id != exclude_user_id)
  ),
  created_users AS (
    SELECT DISTINCT u.id, u.name, u.role
    FROM event_info ei
    JOIN users u ON u.id = ei.created_by
    WHERE ei.created_by IS NOT NULL
      AND (exclude_user_id IS NULL OR u.id != exclude_user_id)
  ),
  -- Get users based on property assignment (if event is related to a property)
  property_users AS (
    SELECT DISTINCT u.id, u.name, u.role
    FROM event_info ei
    JOIN properties p ON p.id = ei.property_id
    LEFT JOIN users u ON (
      -- Property assigned agent
      u.id = p.agent_id
      -- Property referrals
      OR u.id IN (
        SELECT r.employee_id 
        FROM referrals r 
        WHERE r.property_id = ei.property_id
      )
    )
    WHERE ei.property_id IS NOT NULL
      AND u.id IS NOT NULL
      AND (exclude_user_id IS NULL OR u.id != exclude_user_id)
  ),
  -- Get users based on lead assignment (if event is related to a lead)
  lead_users AS (
    SELECT DISTINCT u.id, u.name, u.role
    FROM event_info ei
    JOIN leads l ON l.id = ei.lead_id
    LEFT JOIN users u ON (
      -- Lead assigned agent
      u.id = l.agent_id
      -- Lead referrals
      OR u.id IN (
        SELECT r.employee_id 
        FROM lead_referrals r 
        WHERE r.lead_id = ei.lead_id
      )
    )
    WHERE ei.lead_id IS NOT NULL
      AND u.id IS NOT NULL
      AND (exclude_user_id IS NULL OR u.id != exclude_user_id)
  ),
  -- Get management users (admin, operations manager, operations, agent manager)
  management_users AS (
    SELECT DISTINCT u.id, u.name, u.role
    FROM users u
    WHERE u.role IN ('admin', 'operations manager', 'operations', 'agent manager')
      AND (exclude_user_id IS NULL OR u.id != exclude_user_id)
  ),
  -- Get team leaders for assigned agents
  team_leader_users AS (
    SELECT DISTINCT u.id, u.name, u.role
    FROM event_info ei
    JOIN team_agents ta ON ta.agent_id = ei.assigned_to
    JOIN users u ON u.id = ta.team_leader_id
    WHERE ei.assigned_to IS NOT NULL
      AND ta.is_active = true
      AND (exclude_user_id IS NULL OR u.id != exclude_user_id)
  )
  -- Combine all user groups
  SELECT * FROM assigned_users
  UNION
  SELECT * FROM created_users
  UNION
  SELECT * FROM property_users
  UNION
  SELECT * FROM lead_users
  UNION
  SELECT * FROM management_users
  UNION
  SELECT * FROM team_leader_users;
END;
$$ LANGUAGE plpgsql;
