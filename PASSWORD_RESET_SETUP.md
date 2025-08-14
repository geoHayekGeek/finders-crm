# Password Reset System Setup

This document provides setup instructions for the password reset functionality in the Finders CRM system.

## Features

- **Forgot Password Page**: Users enter their email to request a password reset
- **Email Verification**: 6-digit verification code sent via email
- **Code Verification Page**: Users enter the verification code
- **New Password Page**: Users set their new password
- **Resend Functionality**: Users can resend verification codes with 1-minute cooldown
- **Security Features**: Rate limiting, token expiration, and secure password requirements

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install nodemailer crypto
```

### 2. Environment Variables

Add the following to your `.env` file:

```env
# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Note: For Gmail, use an App Password, not your regular password
# Generate one at: https://myaccount.google.com/apppasswords
```

### 3. Database Setup

Run the SQL script to create the password_resets table:

```bash
psql -U your_username -d your_database -f database/password_resets.sql
```

Or manually execute the SQL commands in your database client.

### 4. Start the Backend

```bash
cd backend
npm start
```

## Frontend Setup

### 1. Install Dependencies

The required dependencies are already included in the package.json.

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

## Usage Flow

### 1. User Requests Password Reset
- Navigate to `/forgot-password`
- Enter email address
- Submit button is disabled until email is valid
- System checks if user exists (without revealing existence)
- If user exists, verification code is sent via email

### 2. User Enters Verification Code
- Navigate to `/reset-password?email=user@example.com`
- Enter 6-digit verification code
- Option to resend code (1-minute cooldown)
- Code expires after 10 minutes

### 3. User Sets New Password
- Navigate to `/new-password?email=user@example.com&code=123456`
- Enter new password with strength requirements
- Confirm password
- Password is updated and user is redirected to login

## Security Features

- **Rate Limiting**: Prevents abuse of password reset endpoints
- **Token Expiration**: Reset codes expire after 10 minutes
- **Secure Passwords**: Minimum 8 characters with complexity requirements
- **Email Validation**: Proper email format validation
- **Token Cleanup**: Expired tokens are automatically cleaned up

## API Endpoints

### POST /api/password-reset/request
Request a password reset code.

**Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /api/password-reset/verify
Verify a reset code.

**Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

### POST /api/password-reset/reset
Reset password with verified code.

**Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "NewPassword123"
}
```

### POST /api/password-reset/resend
Resend verification code.

**Body:**
```json
{
  "email": "user@example.com"
}
```

## Rate Limiting

- **Request Reset**: 5 requests per 15 minutes
- **Verify Code**: 10 attempts per 15 minutes
- **Reset Password**: 5 attempts per 15 minutes
- **Resend Code**: 3 requests per minute

## Email Templates

The system includes beautiful HTML email templates for:
- Password reset requests
- Password change confirmations

## Troubleshooting

### Email Not Sending
1. Check SMTP configuration in `.env`
2. Verify SMTP credentials
3. Check firewall/network settings
4. For Gmail, ensure 2FA is enabled and App Password is used

### Database Issues
1. Ensure password_resets table exists
2. Check database connection
3. Verify table permissions

### Frontend Issues
1. Check API endpoint configuration
2. Verify CORS settings
3. Check browser console for errors

## Customization

### Email Templates
Modify email templates in `backend/utils/email.js`

### Password Requirements
Update validation rules in `backend/routes/passwordResetRoutes.js`

### Rate Limiting
Adjust limits in `backend/routes/passwordResetRoutes.js`

### UI Styling
Modify Tailwind classes in the frontend components

## Support

For issues or questions, check the console logs and ensure all dependencies are properly installed.
