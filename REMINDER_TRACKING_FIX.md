# Email Reminder Tracking Fix

## Problem Description

When the "1 hour before" (or any other reminder) email setting was disabled and then re-enabled, the reminders stopped working. This happened because:

1. The system was creating tracking records for reminders before checking if the reminder type was enabled
2. Even when emails weren't sent (due to disabled settings), the tracking records were marked as "sent"
3. When the setting was re-enabled, the system saw existing "sent" records and skipped sending new reminders

## Solution Implemented

### 1. **Fixed Reminder Service Logic**
   - Modified `sendEmailReminder()` and `sendInAppNotification()` to return boolean status
   - Updated `processEventReminder()` to only mark tracking records as "sent" if they were actually sent
   - Now correctly tracks which reminders were actually delivered vs. skipped

### 2. **Database Improvements**
   - Added unique constraint on `(event_id, user_id, reminder_type)` to prevent duplicate tracking
   - Created migration to clean up invalid tracking records
   - Added helper functions for maintenance

### 3. **Maintenance Functions**
   - `reset_reminder_tracking_for_type(reminder_type)` - Resets tracking for a specific reminder type
   - `cleanup_old_reminder_tracking()` - Removes tracking records older than 30 days

## How to Fix Your Current Installation

### Quick Fix (Recommended)

Run the fix script to apply all changes:

```bash
cd backend
node scripts/fix-reminder-tracking.js
```

This will:
- Apply the database migration
- Add the unique constraint
- Clean up invalid tracking records
- Show statistics about your reminder tracking

### Manual Steps (If Preferred)

1. **Apply Database Migration**
   ```bash
   cd backend
   psql -U your_username -d your_database -f database/migrations/add_unique_constraint_reminder_tracking.sql
   ```

2. **Restart the Backend Server**
   ```bash
   npm start
   ```

## Verification

After applying the fix, you can verify it's working by:

1. **Check Database Constraint**
   ```sql
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'reminder_tracking';
   ```
   Should show the unique constraint.

2. **Test the Reminder Settings**
   - Go to Settings → Email Automation
   - Toggle the "1 Hour Before" reminder off and on
   - Check that new calendar events still receive reminders

3. **Check Logs**
   The reminder service now logs detailed information:
   ```
   ✅ 1_hour reminder sent to John Doe (Email: true, Notification: true)
   ⚠️ 1_hour reminder skipped for Jane Doe (reminders disabled or failed)
   ```

## How It Works Now

### Before the Fix
```
1. Create tracking record → email_sent = false
2. Try to send email → Skipped (setting disabled)
3. Mark tracking as sent → email_sent = true ❌ (Wrong!)
4. Re-enable setting
5. System sees email_sent = true → Skip reminder ❌
```

### After the Fix
```
1. Create tracking record → email_sent = false
2. Try to send email → Returns false (setting disabled)
3. Mark tracking as NOT sent → email_sent = false ✅
4. Re-enable setting
5. System sees email_sent = false → Send reminder ✅
```

## Maintenance

### Reset Tracking for a Specific Reminder Type

If you need to reset tracking records for upcoming events:

```sql
-- Reset 1-hour reminders
SELECT reset_reminder_tracking_for_type('1_hour');

-- Reset 1-day reminders
SELECT reset_reminder_tracking_for_type('1_day');

-- Reset same-day reminders
SELECT reset_reminder_tracking_for_type('same_day');
```

### Clean Up Old Tracking Records

```sql
-- Remove tracking records for events older than 30 days
SELECT cleanup_old_reminder_tracking();
```

### View Current Tracking Statistics

```sql
SELECT 
  reminder_type,
  COUNT(*) as total,
  SUM(CASE WHEN email_sent = true THEN 1 ELSE 0 END) as email_sent_count,
  SUM(CASE WHEN notification_sent = true THEN 1 ELSE 0 END) as notification_sent_count
FROM reminder_tracking
GROUP BY reminder_type;
```

## Files Modified

1. `backend/services/reminderService.js` - Fixed tracking logic
2. `backend/database/reminder_tracking.sql` - Added unique constraint
3. `backend/database/migrations/add_unique_constraint_reminder_tracking.sql` - Migration script
4. `backend/scripts/fix-reminder-tracking.js` - One-time fix script

## Future Improvements

Consider these enhancements:

1. Add an admin UI to reset reminder tracking
2. Add email delivery status tracking
3. Implement retry logic for failed reminders
4. Add detailed logging/audit trail for reminders

## Troubleshooting

### Reminders Still Not Working?

1. **Check if reminder service is running:**
   ```bash
   # Look for this in logs:
   # "✅ Reminder scheduler started successfully"
   ```

2. **Check email settings are enabled:**
   - Settings → Email Automation → Email Notifications (Global)
   - Settings → Email Automation → Calendar Events
   - Settings → Email Automation → Calendar Event Reminders → 1 Hour Before

3. **Check for upcoming events:**
   ```sql
   SELECT * FROM calendar_events 
   WHERE start_time > NOW() 
   AND start_time <= NOW() + INTERVAL '2 hours';
   ```

4. **Check tracking records:**
   ```sql
   SELECT * FROM reminder_tracking 
   WHERE email_sent = false AND notification_sent = false
   ORDER BY created_at DESC LIMIT 10;
   ```

5. **Run the fix script again:**
   ```bash
   node scripts/fix-reminder-tracking.js
   ```

## Support

If you continue to experience issues:
1. Check the backend logs for error messages
2. Verify your email service configuration (`.env` file)
3. Test email sending with: `node scripts/reminderManager.js test-email`

---

**Note:** This fix maintains backward compatibility and does not affect existing reminder functionality. It only improves the tracking accuracy and resolves the issue with disabled/re-enabled settings.


