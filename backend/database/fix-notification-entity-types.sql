-- Migration: Add 'viewing' and 'calendar_event' to valid entity_types in notifications table
-- This fixes the issue where viewing notifications fail due to CHECK constraint violation

-- Drop the existing CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;

-- Add the updated CHECK constraint with 'viewing' and 'calendar_event' included
ALTER TABLE notifications 
ADD CONSTRAINT notifications_entity_type_check 
CHECK (entity_type IN ('property', 'lead', 'user', 'system', 'viewing', 'calendar_event'));

-- Verify the constraint was added successfully
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_entity_type_check';

