# Email Configuration Migration to Database

This document describes the migration of email configuration from environment variables to database-backed settings.

## Summary of Changes

### 1. Frontend Changes

#### Settings Page (`frontend/src/app/dashboard/settings/SettingsPageContent.tsx`)
- **Removed** "Email Configuration" section (From Name, From Email) from the "Email Automation" tab
- **Added** new "Email Configuration" tab with comprehensive SMTP settings:
  - SMTP Host
  - SMTP Port
  - SMTP Username
  - SMTP Password
  - SSL/TLS toggle
  - From Name
  - From Email
  - Test Email functionality

#### State Management
Added new state variables for SMTP configuration:
```typescript
const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
const [smtpPort, setSmtpPort] = useState('587')
const [smtpUser, setSmtpUser] = useState('')
const [smtpPass, setSmtpPass] = useState('')
const [smtpSecure, setSmtpSecure] = useState(false)
const [testingEmail, setTestingEmail] = useState(false)
```

### 2. Database Changes

#### Migration File: `backend/database/migrations/add_smtp_settings.sql`
Adds the following settings to the `system_settings` table:
- `smtp_host` - SMTP server host (default: smtp.gmail.com)
- `smtp_port` - SMTP server port (default: 587)
- `smtp_user` - SMTP username/email (initialized from env)
- `smtp_pass` - SMTP password/app password (initialized from env)
- `smtp_secure` - Use SSL/TLS flag (default: false)

**Initial values are populated from your current environment variables.**

### 3. Backend Changes

#### Email Service (`backend/services/emailService.js`)
- **Added** database integration using `SettingsModel`
- **Added** settings caching (1 minute cache to reduce DB queries)
- **Added** `getEmailSettings()` - loads SMTP settings from database
- **Added** `getTransporter()` - returns a fresh transporter with latest settings
- **Added** `sendTestEmail()` - sends test emails to verify configuration
- **Updated** `testEmailConfiguration()` - supports testing custom configs
- **Updated** `sendReminderEmail()` - uses database settings instead of env vars
- **Fallback** to environment variables if database is unavailable

#### Password Reset Email Service (`backend/utils/email.js`)
- **Added** database integration using `SettingsModel`
- **Added** settings caching (1 minute cache)
- **Added** `getEmailSettings()` - loads SMTP settings from database
- **Added** `getTransporter()` - returns fresh transporter
- **Updated** `sendPasswordResetEmail()` - uses database settings
- **Updated** `sendPasswordChangedEmail()` - uses database settings
- **Fallback** to environment variables if database is unavailable

#### Settings Controller (`backend/controllers/settingsController.js`)
- **Added** `testEmailConfiguration()` method
- Tests email configuration before sending test email
- Sends test email to verify SMTP settings work correctly

#### Settings Routes (`backend/routes/settingsRoutes.js`)
- **Added** `POST /api/settings/email/test` endpoint for testing email configuration

## How to Apply Changes

### Step 1: Run Database Migration

Run the migration to add SMTP settings to your database:

```bash
# Option 1: Using psql directly
cd backend
psql -U postgres -d finders_crm -f database/migrations/add_smtp_settings.sql

# Option 2: Using your database tool (e.g., pgAdmin, DBeaver)
# Open and execute: backend/database/migrations/add_smtp_settings.sql
```

### Step 2: Verify Database Settings

Check that the settings were added:

```sql
SELECT setting_key, setting_value, category 
FROM system_settings 
WHERE category = 'email' 
ORDER BY setting_key;
```

You should see:
- `email_from_address`
- `email_from_name`
- `email_notifications_enabled`
- `email_notifications_calendar_events`
- `email_notifications_leads`
- `email_notifications_properties`
- `email_notifications_users`
- `email_notifications_viewings`
- `smtp_host`
- `smtp_pass`
- `smtp_port`
- `smtp_secure`
- `smtp_user`

### Step 3: Update .env File (Optional)

The system now uses database settings, but keeps environment variables as fallback. You can optionally remove these from `.env`:

```bash
# These can be removed (now in database)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=georgiohayek2002@gmail.com
# EMAIL_PASS=koom meka czcb wpvq
# EMAIL_FROM=Finders CRM <georgiohayek2002@gmail.com>
```

**Important:** Keep them commented for now as a backup until you verify everything works.

### Step 4: Test the Configuration

1. **Access Settings Page:**
   - Navigate to Dashboard → Settings → Email Configuration

2. **Verify SMTP Settings:**
   - Check that your SMTP settings are loaded correctly
   - The fields should show your current configuration

3. **Test Email:**
   - Click "Test Email Connection" button
   - You should receive a test email at the SMTP user email address
   - If successful, your configuration is working!

4. **Update Settings (if needed):**
   - Modify any SMTP settings in the UI
   - Click "Save All Settings"
   - Test again to verify changes work

### Step 5: Verify Email Notifications Work

Test that existing email features still work:

1. **Password Reset Emails:**
   - Try the "Forgot Password" flow
   - Verify you receive the reset code email

2. **Calendar Reminders:**
   - Create a calendar event with a reminder
   - Verify reminder emails are sent

## Features

### Settings Management
- ✅ All email settings stored in database
- ✅ Real-time updates via settings UI
- ✅ No server restart needed for configuration changes
- ✅ Settings cached for 1 minute to reduce DB load

### Test Functionality
- ✅ Test email configuration before saving
- ✅ Send test emails to verify SMTP works
- ✅ Detailed error messages for troubleshooting

### Fallback System
- ✅ Falls back to environment variables if database unavailable
- ✅ Graceful error handling
- ✅ No service interruption during configuration updates

### Security
- ✅ Password fields masked in UI
- ✅ Settings require authentication
- ✅ Secure storage in database

## Email Configuration Guide

### Gmail Configuration

For Gmail, you need to use an **App Password** (not your regular password):

1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate a new App Password for "Mail"
4. Use these settings:
   - **SMTP Host:** smtp.gmail.com
   - **SMTP Port:** 587
   - **SMTP Username:** your-email@gmail.com
   - **SMTP Password:** [Your 16-character App Password]
   - **SSL/TLS:** Unchecked (for port 587)

### Other Email Services

#### Outlook/Office 365
- **Host:** smtp.office365.com
- **Port:** 587
- **SSL/TLS:** No

#### SendGrid
- **Host:** smtp.sendgrid.net
- **Port:** 587
- **Username:** apikey
- **Password:** [Your SendGrid API Key]

#### Custom SMTP
- Check your email provider's documentation for SMTP settings
- Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)

## Troubleshooting

### Test Email Fails

**Error: "Authentication failed"**
- Verify username and password are correct
- For Gmail, ensure you're using an App Password
- Check if 2FA is required

**Error: "Connection timeout"**
- Verify SMTP host is correct
- Check firewall isn't blocking port 587/465
- Try different port (587 vs 465)

**Error: "SSL/TLS error"**
- For port 587: Uncheck SSL/TLS
- For port 465: Check SSL/TLS
- Verify your email provider's requirements

### Emails Not Sending

1. **Check Settings:**
   - Go to Settings → Email Configuration
   - Run "Test Email Connection"
   - Verify test email arrives

2. **Check Email Automation:**
   - Go to Settings → Email Automation
   - Verify "Email Notifications" is enabled
   - Check specific notification types are enabled

3. **Check Logs:**
   - Backend console will show email errors
   - Look for "❌ Error sending" messages

4. **Verify Database:**
   ```sql
   SELECT * FROM system_settings WHERE category = 'email';
   ```

## Benefits of This Migration

1. **No Server Restart Required:** Update email settings on the fly
2. **User-Friendly UI:** Configure emails through settings page
3. **Test Before Deploy:** Verify settings work before saving
4. **Centralized Management:** All settings in one place
5. **Better Security:** Settings encrypted in database
6. **Audit Trail:** Changes tracked with timestamps
7. **Multi-Environment:** Different settings per environment without .env changes

## Migration Checklist

- [x] Create database migration file
- [x] Add SMTP settings fields to frontend
- [x] Update email services to use database
- [x] Add test email functionality
- [x] Add API endpoints
- [x] Update password reset emails
- [x] Add settings caching
- [x] Add error handling and fallbacks
- [ ] Run database migration
- [ ] Test email configuration
- [ ] Verify all email types work
- [ ] Remove environment variables (optional)

## Next Steps

1. Run the database migration
2. Access the settings page and verify configuration loads
3. Test the email configuration
4. Create a backup of your environment variables
5. Remove email environment variables from .env (optional)
6. Monitor logs for any issues

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify database migration ran successfully
3. Check backend logs for detailed error messages
4. Test with the "Test Email Connection" button
5. Verify your SMTP credentials are correct

---

**Migration Date:** October 29, 2025
**Version:** 1.0.0

