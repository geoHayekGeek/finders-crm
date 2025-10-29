-- Migration: Add unique constraint to reminder_tracking table and clean up invalid records
-- This fixes the issue where reminders marked as "sent" even when they were skipped due to disabled settings

-- Step 1: Delete tracking records where both email_sent and notification_sent are false
-- These are records that were created but never actually sent
DELETE FROM reminder_tracking 
WHERE email_sent = false AND notification_sent = false;

-- Step 2: For future events, reset tracking records where email was not sent but was marked as sent
-- This handles the case where settings were disabled and then re-enabled
UPDATE reminder_tracking rt
SET email_sent = false, notification_sent = false, sent_at = NULL
FROM calendar_events ce
WHERE rt.event_id = ce.id
  AND ce.start_time > NOW()
  AND rt.email_sent = false
  AND rt.notification_sent = false;

-- Step 3: Add unique constraint to prevent duplicate tracking records
-- This will prevent the same reminder from being tracked multiple times
ALTER TABLE reminder_tracking 
  DROP CONSTRAINT IF EXISTS reminder_tracking_event_user_type_unique;

ALTER TABLE reminder_tracking 
  ADD CONSTRAINT reminder_tracking_event_user_type_unique 
  UNIQUE (event_id, user_id, reminder_type);

-- Step 4: Create a function to reset reminder tracking for a specific reminder type
-- This can be called when an admin re-enables a reminder setting
CREATE OR REPLACE FUNCTION reset_reminder_tracking_for_type(p_reminder_type VARCHAR(20))
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete tracking records for future events of the specified type
  DELETE FROM reminder_tracking rt
  USING calendar_events ce
  WHERE rt.event_id = ce.id
    AND rt.reminder_type = p_reminder_type
    AND ce.start_time > NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a function to clean up old tracking records (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_reminder_tracking()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM reminder_tracking rt
  USING calendar_events ce
  WHERE rt.event_id = ce.id
    AND ce.start_time < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added unique constraint to reminder_tracking and cleaned up invalid records';
END $$;


