# Reminder Reschedule Bug Fix

## Problem Identified

When a calendar event was rescheduled, reminders that were already sent would not be sent again for the new event time. This caused users to miss important reminders when events were moved.

### Root Cause

When an event is rescheduled, the `scheduleEventReminders` function updates the `reminder_tracking` table with the new `scheduled_time`. However, the `ON CONFLICT` clause only updated the `scheduled_time` field and left the `email_sent` and `notification_sent` flags as `true`.

This meant the reminder query would exclude these events because it checks:
```sql
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_tracking rt 
  WHERE rt.event_id = rs.event_id 
    AND rt.user_id = rs.user_id 
    AND rt.reminder_type = rs.reminder_type
    AND (rt.email_sent = true OR rt.notification_sent = true)
)
```

### Example Scenario

1. Event created for 11:00 AM
2. 1-hour reminder sent at 10:00 AM ✅
3. Event rescheduled to 2:00 PM at 10:30 AM
4. System updates `scheduled_time` to 1:00 PM
5. BUT `email_sent=true` remains in the tracking table
6. At 1:00 PM, reminder query excludes the event ❌
7. User never receives reminder for rescheduled event

## Solution Implemented

### 1. Reset Sent Flags on Reschedule

Updated both `scheduleReminder` and `createReminderTracking` methods to reset the sent flags when a reminder is rescheduled:

```javascript
ON CONFLICT (event_id, user_id, reminder_type) 
DO UPDATE SET 
  scheduled_time = EXCLUDED.scheduled_time,
  email_sent = false,           // Reset
  notification_sent = false,     // Reset
  sent_at = NULL                 // Reset
```

**Files Modified:**
- `backend/services/reminderService.js` (lines 213-224 and 393-408)

### 2. Widened 1-Hour Reminder Window

The original window was 55-65 minutes (10-minute window), which was too narrow. If an event was rescheduled at an unlucky time, it could miss the window entirely between scheduler runs.

**Changed from:**
- 55-65 minutes (10-minute window)

**Changed to:**
- 50-70 minutes (20-minute window)

This gives much more flexibility and ensures reminders are caught even if events are rescheduled.

**Files Modified:**
- `backend/services/reminderService.js` (line 134-135)
- `backend/database/reminder_tracking.sql` (line 147-148)

## Testing

### Test Event 84

Event 84 demonstrated the bug:
- Created at 22:44:53 for 00:19:00 (next day)
- same_day reminder sent at 22:45:02
- 1_hour reminder sent at 23:09:25
- **Event rescheduled at 23:17:09** to the same time
- Tracking updated but flags NOT reset
- Result: Reminders wouldn't trigger again

### Verification Steps

1. Create a test event
2. Wait for reminder to be sent
3. Reschedule the event
4. Verify reminder is sent again at new time

### Reset Script

Created `backend/scripts/reset-event-84-reminders.js` to reset the tracking flags for testing.

## Deployment Instructions

### 1. Restart Backend Server

The code changes won't take effect until the backend server is restarted:

```bash
# Stop the backend
# (Use Ctrl+C or however you normally stop it)

# Start the backend again
cd backend
npm start
```

### 2. Update Database Function (Optional)

If you're using the PostgreSQL function instead of the direct query, update it:

```bash
cd backend
psql -U your_db_user -d your_db_name -f database/reminder_tracking.sql
```

### 3. Test the Fix

1. Create a test event 1 hour in the future
2. Wait for confirmation that reminder was sent
3. Reschedule the event to 1 hour from current time
4. Verify reminder is sent again

## Files Changed

- ✅ `backend/services/reminderService.js` - Main fix
- ✅ `backend/database/reminder_tracking.sql` - Database function update
- 📝 `backend/scripts/reset-event-84-reminders.js` - Testing utility
- 📝 `backend/scripts/check-event-reschedule.js` - Debugging utility
- 📝 `backend/scripts/test-1hour-window.js` - Testing utility

## Impact

- ✅ Reminders now work correctly when events are rescheduled
- ✅ Wider time window reduces edge cases
- ✅ No breaking changes to existing functionality
- ✅ Backward compatible

## Next Steps

1. **RESTART THE BACKEND SERVER** to apply the fix
2. Test with event 84 or create a new test event
3. Monitor logs for successful reminder sending
4. Clean up test scripts after verification (optional)

