-- Reminder Tracking Table
CREATE TABLE IF NOT EXISTS reminder_tracking (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('1_day', 'same_day', '1_hour')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (event_id, user_id, reminder_type)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_event_id ON reminder_tracking(event_id);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_user_id ON reminder_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_scheduled_time ON reminder_tracking(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_reminder_type ON reminder_tracking(reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_tracking_sent ON reminder_tracking(email_sent, notification_sent);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reminder_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at column
DROP TRIGGER IF EXISTS update_reminder_tracking_updated_at ON reminder_tracking;
CREATE TRIGGER update_reminder_tracking_updated_at 
  BEFORE UPDATE ON reminder_tracking 
  FOR EACH ROW 
  EXECUTE FUNCTION update_reminder_tracking_updated_at();

-- Function to get events that need reminders
CREATE OR REPLACE FUNCTION get_events_needing_reminders()
RETURNS TABLE(
  event_id INTEGER,
  user_id INTEGER,
  user_name VARCHAR,
  user_email VARCHAR,
  event_title VARCHAR,
  event_start_time TIMESTAMP WITH TIME ZONE,
  event_end_time TIMESTAMP WITH TIME ZONE,
  event_location TEXT,
  event_description TEXT,
  reminder_type VARCHAR,
  scheduled_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH upcoming_events AS (
    SELECT 
      ce.id as event_id,
      ce.title as event_title,
      ce.start_time as event_start_time,
      ce.end_time as event_end_time,
      ce.location as event_location,
      ce.description as event_description,
      ce.created_by,
      ce.assigned_to,
      ce.attendees
    FROM calendar_events ce
    WHERE ce.start_time > NOW()
      AND ce.start_time <= NOW() + INTERVAL '2 days'
  ),
  event_users AS (
    -- Event creators
    SELECT DISTINCT 
      ue.event_id,
      ue.event_title,
      ue.event_start_time,
      ue.event_end_time,
      ue.event_location,
      ue.event_description,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email
    FROM upcoming_events ue
    JOIN users u ON u.id = ue.created_by
    
    UNION
    
    -- Event assignees
    SELECT DISTINCT 
      ue.event_id,
      ue.event_title,
      ue.event_start_time,
      ue.event_end_time,
      ue.event_location,
      ue.event_description,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email
    FROM upcoming_events ue
    JOIN users u ON u.id = ue.assigned_to
    WHERE ue.assigned_to IS NOT NULL
    
    UNION
    
    -- Event attendees
    SELECT DISTINCT 
      ue.event_id,
      ue.event_title,
      ue.event_start_time,
      ue.event_end_time,
      ue.event_location,
      ue.event_description,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email
    FROM upcoming_events ue
    JOIN users u ON u.name = ANY(ue.attendees)
    WHERE ue.attendees IS NOT NULL 
      AND array_length(ue.attendees, 1) > 0
  ),
  reminder_schedules AS (
    SELECT 
      eu.*,
      '1_day' as reminder_type,
      eu.event_start_time - INTERVAL '1 day' as scheduled_time
    FROM event_users eu
    WHERE eu.event_start_time > NOW() + INTERVAL '23 hours'
      AND eu.event_start_time <= NOW() + INTERVAL '25 hours'
    
    UNION
    
    SELECT 
      eu.*,
      'same_day' as reminder_type,
      CASE 
        WHEN EXTRACT(HOUR FROM eu.event_start_time) >= 9 
        THEN (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp
        ELSE (DATE(eu.event_start_time) - INTERVAL '4 hours')::timestamp
      END as scheduled_time
    FROM event_users eu
    WHERE (
      CASE 
        WHEN EXTRACT(HOUR FROM eu.event_start_time) >= 9 
        THEN (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp
        ELSE (DATE(eu.event_start_time) - INTERVAL '4 hours')::timestamp
      END
    ) >= NOW() - INTERVAL '30 minutes'
      AND (
      CASE 
        WHEN EXTRACT(HOUR FROM eu.event_start_time) >= 9 
        THEN (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp
        ELSE (DATE(eu.event_start_time) - INTERVAL '4 hours')::timestamp
      END
    ) <= NOW() + INTERVAL '30 minutes'
      AND eu.event_start_time > NOW()
    
    UNION
    
    SELECT 
      eu.*,
      '1_hour' as reminder_type,
      eu.event_start_time - INTERVAL '1 hour' as scheduled_time
    FROM event_users eu
    WHERE eu.event_start_time > NOW() + INTERVAL '50 minutes'
      AND eu.event_start_time <= NOW() + INTERVAL '70 minutes'
  )
  SELECT 
    rs.event_id,
    rs.user_id,
    rs.user_name,
    rs.user_email,
    rs.event_title,
    rs.event_start_time,
    rs.event_end_time,
    rs.event_location,
    rs.event_description,
    rs.reminder_type,
    rs.scheduled_time
  FROM reminder_schedules rs
  WHERE NOT EXISTS (
    SELECT 1 FROM reminder_tracking rt 
    WHERE rt.event_id = rs.event_id 
      AND rt.user_id = rs.user_id 
      AND rt.reminder_type = rs.reminder_type
      AND (rt.email_sent = true OR rt.notification_sent = true)
  )
  ORDER BY rs.scheduled_time ASC;
END;
$$ LANGUAGE plpgsql;
