# Gmail SMTP Setup Guide

## Problem
You're getting this error when trying to send emails:
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

This happens because Gmail has disabled support for "less secure apps" and requires an "App Password" for SMTP authentication.

## Solution: Use App Passwords

### Step 1: Enable 2-Factor Authentication (Required)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled
3. This is required to create App Passwords

### Step 2: Generate an App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Scroll down to "Signing in to Google"
3. Click on "App passwords" (only visible if 2FA is enabled)
4. Select "Mail" as the app and "Other" as the device
5. Click "Generate"
6. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update Environment Variables
Create a `.env` file in your `backend` directory with these variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

**Important Notes:**
- Use your full Gmail address for `SMTP_USER`
- Use the 16-character App Password (no spaces) for `SMTP_PASS`
- Do NOT use your regular Gmail password

### Step 4: Restart Your Server
After updating the `.env` file, restart your backend server for the changes to take effect.

## Alternative Solutions

### Option 1: Use Gmail OAuth2 (More Secure)
For production use, consider implementing Gmail OAuth2 authentication instead of App Passwords.

### Option 2: Use a Different Email Service
Consider using services like:
- SendGrid
- Mailgun
- Amazon SES
- Resend

These services are designed for transactional emails and have better deliverability.

## Testing
After setup, test the email functionality:
1. Try requesting a password reset
2. Check your email for the reset code
3. Verify the code works

## Security Notes
- Never commit your `.env` file to version control
- App Passwords are specific to your application
- You can revoke App Passwords at any time from Google Account Security
- Each App Password can only be viewed once when generated

## Troubleshooting
If you still get authentication errors:
1. Verify 2FA is enabled
2. Check that you're using the App Password (not regular password)
3. Ensure the email address is correct
4. Try generating a new App Password
5. Check if your Gmail account has any restrictions
