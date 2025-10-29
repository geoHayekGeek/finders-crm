# Quick Start: Email Configuration Setup

## Running the Migration

### Option 1: Using Node.js Script (Recommended)
```bash
cd backend
node scripts/run-email-migration.js
```

### Option 2: Using PostgreSQL directly
```bash
cd backend
# Windows (with psql in PATH)
psql -U postgres -d finders_crm -f database/migrations/add_smtp_settings.sql

# Or find your PostgreSQL installation
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d finders_crm -f database/migrations/add_smtp_settings.sql
```

### Option 3: Using pgAdmin or Database Tool
1. Open pgAdmin
2. Connect to your `finders_crm` database
3. Open Query Tool
4. Load and execute: `backend/database/migrations/add_smtp_settings.sql`

## Accessing Email Settings

1. Navigate to: **Dashboard → Settings → Email Configuration**
2. You'll see three tabs:
   - **Company & Branding** (unchanged)
   - **Email Automation** (notification toggles - "From Name" and "From Email" removed)
   - **Email Configuration** (NEW - SMTP settings)

## What Changed

### ✅ Removed (from Email Automation tab)
- "From Name" field
- "From Email" field

### ✅ Added (new Email Configuration tab)
- SMTP Host
- SMTP Port  
- SMTP Username
- SMTP Password
- SSL/TLS toggle
- From Name
- From Email
- Test Email Connection button

## Testing Your Configuration

1. Go to **Settings → Email Configuration**
2. Verify your SMTP settings are correct:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: Your email
   - Password: Your app password
3. Click **"Test Email Connection"**
4. Check your email inbox for the test message
5. If successful: ✅ Configuration is working!
6. If failed: Check error message and troubleshoot

## Gmail Setup (Most Common)

### Requirements
1. Enable 2-Factor Authentication on Google account
2. Generate App Password at: https://myaccount.google.com/apppasswords

### Settings
```
SMTP Host:     smtp.gmail.com
SMTP Port:     587
Username:      your-email@gmail.com
Password:      [16-character App Password]
SSL/TLS:       ❌ Unchecked (for port 587)
From Name:     Finders CRM (or your preference)
From Email:    your-email@gmail.com
```

## Environment Variables

### Current .env (keep as fallback)
```bash
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=georgiohayek2002@gmail.com
EMAIL_PASS=koom meka czcb wpvq
EMAIL_FROM=Finders CRM <georgiohayek2002@gmail.com>
```

### After Successful Testing (optional)
You can comment out or remove these from .env:
```bash
# These are now in database - keeping as backup
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=georgiohayek2002@gmail.com
# EMAIL_PASS=koom meka czcb wpvq
# EMAIL_FROM=Finders CRM <georgiohayek2002@gmail.com>
```

## Troubleshooting

### Migration Issues

**Error: "Cannot connect to database"**
```bash
# Check your .env file has correct database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finders_crm
DB_USER=postgres
DB_PASSWORD=your_password
```

**Error: "Permission denied"**
```bash
# Grant permissions or run as postgres user
psql -U postgres
GRANT ALL ON DATABASE finders_crm TO your_user;
```

### Email Test Issues

**❌ Authentication failed**
- ✅ Use App Password for Gmail (not regular password)
- ✅ Check username/password are correct
- ✅ Verify 2FA is enabled for Gmail

**❌ Connection timeout**
- ✅ Check SMTP host is correct
- ✅ Try port 587 or 465
- ✅ Check firewall settings

**❌ SSL/TLS error**
- ✅ Port 587: Uncheck SSL/TLS
- ✅ Port 465: Check SSL/TLS
- ✅ Match port with SSL setting

## Features You Now Have

✅ **No restart needed** - Update email config on the fly  
✅ **Test before save** - Verify SMTP works before committing  
✅ **User-friendly UI** - No more editing .env files  
✅ **Secure storage** - Credentials encrypted in database  
✅ **Settings caching** - Fast performance with 1-min cache  
✅ **Fallback support** - Falls back to .env if DB unavailable  

## Files Changed

### Frontend
- `frontend/src/app/dashboard/settings/SettingsPageContent.tsx`

### Backend
- `backend/services/emailService.js` - Now loads from database
- `backend/utils/email.js` - Password reset emails use database
- `backend/controllers/settingsController.js` - Added test endpoint
- `backend/routes/settingsRoutes.js` - Added test route

### Database
- `backend/database/migrations/add_smtp_settings.sql` - New migration

### Scripts
- `backend/scripts/run-email-migration.js` - Migration helper

### Documentation
- `EMAIL_CONFIGURATION_MIGRATION.md` - Full documentation
- `QUICK_START_EMAIL_CONFIG.md` - This file

## Support Commands

### Check database settings
```sql
SELECT setting_key, setting_value, category 
FROM system_settings 
WHERE category = 'email' 
ORDER BY setting_key;
```

### Update a setting manually
```sql
UPDATE system_settings 
SET setting_value = 'new_value' 
WHERE setting_key = 'smtp_host';
```

### Reset to environment variables
```sql
UPDATE system_settings 
SET setting_value = 'smtp.gmail.com' 
WHERE setting_key = 'smtp_host';
```

## Need Help?

1. ✅ Read full documentation: `EMAIL_CONFIGURATION_MIGRATION.md`
2. ✅ Check backend console logs for errors
3. ✅ Use "Test Email Connection" for diagnostics
4. ✅ Verify database migration completed
5. ✅ Check SMTP credentials are correct

---

**Ready to go?** Run the migration and start using database-backed email configuration! 🚀

