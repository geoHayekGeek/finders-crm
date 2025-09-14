-- Add time validation constraints for calendar events
-- Migration: add_time_constraints.sql

-- Add constraint to ensure end_time is after start_time for non-all-day events
ALTER TABLE calendar_events 
ADD CONSTRAINT check_calendar_events_time_order 
CHECK (all_day = true OR end_time > start_time);

-- Add constraint to ensure start_time and end_time are not null
ALTER TABLE calendar_events 
ADD CONSTRAINT check_calendar_events_times_not_null 
CHECK (start_time IS NOT NULL AND end_time IS NOT NULL);

-- Add comments for documentation
COMMENT ON CONSTRAINT check_calendar_events_time_order ON calendar_events 
IS 'Ensures end time is after start time for non-all-day events';

COMMENT ON CONSTRAINT check_calendar_events_times_not_null ON calendar_events 
IS 'Ensures start_time and end_time are not null';

-- Display success message
SELECT 'Time validation constraints added successfully' as status;
