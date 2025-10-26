# Settings System Setup Instructions

## Quick Setup

### 1. Create Database Tables
Run the following command in the backend directory:

```bash
cd backend
node setup-settings-db.js
```

This will:
- Create the `system_settings` table
- Insert default settings
- Create necessary indexes and triggers

### 2. Create Upload Directory
Create the branding upload directory if it doesn't exist:

```bash
mkdir -p backend/public/uploads/branding
```

### 3. Done!
The settings system is now ready to use. Navigate to `/dashboard/settings` in your frontend.

## Features Available

### Company & Branding Tab
- ✅ Upload company logo
- ✅ Upload favicon
- ✅ Set primary brand color
- ✅ Change company name

### Email Automation Tab
- ✅ Global email toggle (on/off)
- ✅ Component-specific toggles:
  - Calendar Events
  - Viewings
  - Properties
  - Leads
  - Users
- ✅ Email configuration (from name/email)
- ✅ Calendar reminder settings:
  - 1 Day Before
  - Same Day
  - 1 Hour Before

## API Endpoints

All endpoints require admin authentication.

- `GET /api/settings` - Get all settings
- `GET /api/settings/category/:category` - Get settings by category
- `PUT /api/settings/:key` - Update a single setting
- `PUT /api/settings/bulk/update` - Update multiple settings
- `POST /api/settings/logo/upload` - Upload company logo
- `POST /api/settings/favicon/upload` - Upload favicon
- `DELETE /api/settings/logo` - Delete logo
- `DELETE /api/settings/favicon` - Delete favicon

## How Email Automation Works

The system checks these settings in order:

1. **Global Check**: Is `email_notifications_enabled` set to `true`?
2. **Component Check**: Is the specific component's notification enabled? (e.g., `email_notifications_calendar_events`)
3. **Reminder Check**: Is the specific reminder type enabled? (e.g., `reminder_1_day_before`)

If any check fails, the email is not sent. This gives you granular control over when emails are sent.

## Example Usage

### Disable All Email Notifications
1. Go to Settings → Email Automation
2. Turn off "Email Notifications" toggle
3. Save

### Disable Only Calendar Reminders
1. Go to Settings → Email Automation
2. Turn off "Calendar Events" toggle
3. Save

### Disable Specific Reminder Types
1. Go to Settings → Email Automation
2. Turn off any of the reminder toggles (1 Day Before, Same Day, 1 Hour Before)
3. Save

## Troubleshooting

### Settings Not Saving
- Make sure you're logged in as an admin
- Check browser console for errors
- Verify backend is running and routes are registered

### Files Not Uploading
- Check that `backend/public/uploads/branding` directory exists
- Verify file size is under 5MB
- Ensure file type is one of: jpeg, jpg, png, gif, svg, ico, webp

### Emails Still Sending
- Clear the backend cache
- Restart the backend server
- Check that settings were saved to database

## File Storage

Uploaded files are stored in:
- `backend/public/uploads/branding/`
- Accessed via: `http://localhost:10000/uploads/branding/filename`

File names are automatically generated with timestamps to prevent conflicts.
