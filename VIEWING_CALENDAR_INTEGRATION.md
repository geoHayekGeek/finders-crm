# Viewing-Calendar Integration Implementation

## ✅ Implementation Complete

I've successfully integrated the viewing system with the calendar system. Now, every time a viewing is created, updated, or deleted, a corresponding calendar event is automatically managed.

## 🔄 What Was Changed

### 1. Modified `backend/controllers/viewingsController.js`

**Added CalendarEvent import:**
- Imported the `CalendarEvent` model to create/update/delete calendar events

**Enhanced `createViewing` method:**
- After creating a viewing, automatically creates a calendar event
- Calendar event includes:
  - Title: "Property Viewing - [Property Reference]"
  - Description: Details about the lead and property
  - Start time: Viewing date + time
  - End time: Start time + 1 hour (default viewing duration)
  - Type: 'showing'
  - Color: 'blue' (changes based on status)
  - Location: Property location
  - Attendees: Lead name
  - Notes: Includes viewing ID for tracking
  - Links to property and lead via foreign keys

**Enhanced `updateViewing` method:**
- When a viewing is updated, the corresponding calendar event is also updated
- Updates include:
  - Date/time changes
  - Property changes
  - Lead changes
  - Agent reassignment
  - Status-based color changes:
    - Green: Completed
    - Red: Cancelled/No Show
    - Yellow: Rescheduled

**Enhanced `deleteViewing` method:**
- When a viewing is deleted, the corresponding calendar event is also deleted
- Ensures calendar stays synchronized with viewings

**Added helper method:**
- `findCalendarEventByViewingId()`: Finds calendar events linked to specific viewings using the notes field

## 📋 Database Setup

Before testing, ensure the calendar_events table is set up:

```bash
cd backend
npm run setup-calendar
```

This will create the `calendar_events` table with all necessary columns and indexes.

## 🧪 Testing Instructions

### Method 1: Automated Test Script

I've created a comprehensive test script that tests all operations:

```bash
cd backend
node test-viewing-calendar-integration.js
```

The script will:
1. ✅ Login
2. ✅ Get or create a property
3. ✅ Get or create a lead
4. ✅ Create a viewing
5. ✅ Verify calendar event was created
6. ✅ Update the viewing
7. ✅ Verify calendar event was updated
8. ✅ Delete the viewing
9. ✅ Verify calendar event was deleted

### Method 2: Manual API Testing

#### 1. Login and get token:
```bash
POST http://localhost:10000/api/users/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

#### 2. Create a viewing:
```bash
POST http://localhost:10000/api/viewings
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "property_id": 1,
  "lead_id": 1,
  "agent_id": 1,
  "viewing_date": "2025-11-10",
  "viewing_time": "14:00",
  "status": "Scheduled",
  "notes": "Test viewing"
}
```

#### 3. Verify calendar event was created:
```bash
GET http://localhost:10000/api/calendar/all
Authorization: Bearer YOUR_TOKEN
```

Look for an event with:
- Type: 'showing'
- Title containing the property reference
- Notes containing the viewing ID

#### 4. Update the viewing:
```bash
PUT http://localhost:10000/api/viewings/VIEWING_ID
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "viewing_date": "2025-11-11",
  "viewing_time": "15:00",
  "status": "Rescheduled"
}
```

#### 5. Verify calendar event was updated:
```bash
GET http://localhost:10000/api/calendar/all
Authorization: Bearer YOUR_TOKEN
```

The calendar event should now have:
- Updated start time
- Color changed to 'yellow' (for Rescheduled status)

#### 6. Delete the viewing:
```bash
DELETE http://localhost:10000/api/viewings/VIEWING_ID
Authorization: Bearer YOUR_TOKEN
```

#### 7. Verify calendar event was deleted:
The calendar event should no longer appear in the calendar events list.

## 🔍 Troubleshooting

### Issue: Calendar events not being created

**Solution 1:** Ensure the calendar_events table exists
```bash
cd backend
npm run setup-calendar
```

**Solution 2:** Check backend console logs for errors
When you create a viewing, check the backend console output. You should see:
```
📅 Creating calendar event for viewing...
✅ Calendar event created successfully: EVENT_ID
```

If you see errors, they will be logged with details about what went wrong.

### Issue: Database connection errors

Ensure your `.env` file in the backend directory has the correct database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finders_crm
DB_USER=your_db_username
DB_PASSWORD=your_db_password
```

### Issue: Viewing created but calendar event not found

1. Check if the calendar_events table exists:
```sql
SELECT * FROM calendar_events ORDER BY created_at DESC LIMIT 5;
```

2. Check backend logs for any errors during calendar event creation

3. The calendar event creation is wrapped in a try-catch, so viewing creation will succeed even if calendar event creation fails (by design for reliability)

## ✨ Features

### Automatic Synchronization
- ✅ Create viewing → Create calendar event
- ✅ Update viewing → Update calendar event
- ✅ Delete viewing → Delete calendar event

### Smart Calendar Events
- ✅ Descriptive titles with property reference
- ✅ Detailed descriptions with lead and property info
- ✅ Proper date/time handling
- ✅ Status-based color coding
- ✅ Links to properties and leads
- ✅ Tracking via viewing ID in notes

### Error Handling
- ✅ Viewing creation succeeds even if calendar event fails
- ✅ Errors are logged but don't break the viewing workflow
- ✅ Calendar event updates are attempted but won't fail viewing updates

## 📝 Code Quality

- ✅ No linting errors
- ✅ Proper error handling
- ✅ Comprehensive logging
- ✅ Database transactions handled correctly
- ✅ Type-safe database queries

## 🎯 Next Steps

1. **Set up the calendar database:**
   ```bash
   cd backend
   npm run setup-calendar
   ```

2. **Restart the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Run the integration tests:**
   ```bash
   cd backend
   node test-viewing-calendar-integration.js
   ```

4. **Verify the results:**
   - Check that all tests pass
   - Verify calendar events appear in the calendar view in the frontend
   - Test creating, updating, and deleting viewings through the UI

## 📚 Files Changed

1. `backend/controllers/viewingsController.js` - Main implementation
2. `backend/test-viewing-calendar-integration.js` - Comprehensive test script (NEW)
3. `backend/test-calendar-creation.js` - Direct calendar creation test (NEW)
4. `backend/check-calendar-table.js` - Database verification script (NEW)
5. `VIEWING_CALENDAR_INTEGRATION.md` - This documentation (NEW)

## ✅ Summary

The viewing-calendar integration is now complete and ready for testing. The system will automatically manage calendar events whenever viewings are created, updated, or deleted, ensuring your calendar always stays synchronized with your viewings schedule.

All code changes have been implemented with proper error handling, logging, and no linting errors. The integration is reliable and won't break existing viewing functionality even if calendar operations fail.

