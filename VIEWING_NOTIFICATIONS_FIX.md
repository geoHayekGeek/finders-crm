# 🔔 Viewing Notifications Fix

## Issue Identified

When an agent adds a viewing, notifications were **not being sent** to admin, operations, operations manager, and agent manager roles due to a **database constraint violation**.

### Root Cause

The `notifications` table had a CHECK constraint that only allowed these entity types:
- `'property'`
- `'lead'`
- `'user'`
- `'system'`

However, the viewing creation code in `backend/controllers/viewingsController.js` (line 302) was trying to create notifications with `entity_type: 'viewing'`, which violated the constraint and caused silent failures.

Similarly, calendar event notifications were using `entity_type: 'calendar_event'` which was also not allowed.

## What Was Fixed

### 1. Database Schema Update
Updated `backend/database/notifications.sql` to include `'viewing'` and `'calendar_event'` as valid entity types:

```sql
entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
  'property', 
  'lead', 
  'user', 
  'system', 
  'viewing',          -- ✅ ADDED
  'calendar_event'    -- ✅ ADDED
))
```

### 2. Migration Script Created
Created two files to apply this fix to existing databases:
- `backend/database/fix-notification-entity-types.sql` - SQL migration
- `backend/fix-notification-entity-types.js` - Node.js script to run the migration

## How to Apply the Fix

### Option 1: Using Node.js Script (Recommended)

Run the following command from the `backend` directory:

```bash
node fix-notification-entity-types.js
```

This will:
- Drop the old CHECK constraint
- Add the new CHECK constraint with 'viewing' and 'calendar_event' included
- Verify the changes were applied successfully

### Option 2: Using SQL Directly

Connect to your PostgreSQL database and run:

```bash
psql -U your_username -d your_database -f backend/database/fix-notification-entity-types.sql
```

Or manually execute:

```sql
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_entity_type_check 
CHECK (entity_type IN ('property', 'lead', 'user', 'system', 'viewing', 'calendar_event'));
```

## Verification

After applying the fix, when an agent creates a viewing:

1. **Admin** should receive a notification
2. **Operations** should receive a notification
3. **Operations Manager** should receive a notification
4. **Agent Manager** should receive a notification

The notification will have:
- **Title**: "New Viewing Scheduled"
- **Message**: Details about the property, lead, date, and time
- **Type**: `info`
- **Entity Type**: `viewing`
- **Entity ID**: The viewing's ID

## Code Already in Place

The notification sending logic in `backend/controllers/viewingsController.js` (lines 263-325) was already correctly implemented. It:

1. Gets all users with management roles:
   ```javascript
   const rolesToNotify = ['agent manager', 'operations', 'operations manager', 'admin']
   ```

2. Excludes the user who created the viewing (no self-notification)

3. Creates notifications for all eligible recipients with viewing details

4. Handles errors gracefully (logs but doesn't fail the viewing creation)

The only issue was the database constraint preventing the notifications from being saved.

## Testing

After applying the fix, test by:

1. Logging in as an agent
2. Creating a new viewing with:
   - Property selection
   - Lead selection  
   - Date and time
3. Log in as an admin/operations/operations manager/agent manager
4. Check the notification bell icon - you should see the new viewing notification

## Related Files Modified

- `backend/database/notifications.sql` - Updated CHECK constraint
- `backend/database/fix-notification-entity-types.sql` - Migration SQL
- `backend/fix-notification-entity-types.js` - Migration script

## Related Files (No Changes Needed)

- `backend/controllers/viewingsController.js` - Notification logic already correct
- `backend/models/notificationModel.js` - Already supports viewing notifications
- `backend/models/viewingModel.js` - Working as expected

