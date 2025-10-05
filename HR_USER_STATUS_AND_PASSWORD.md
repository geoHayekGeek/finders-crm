# HR System - User Status & Password Management

## New Features Added

### 1. User Status Management (Active/Disabled)

Users can now be enabled or disabled in the system:

#### Database
- ✅ Added `is_active` column to users table
- ✅ Defaults to `TRUE` for all users
- ✅ Indexed for faster queries

#### Backend
- ✅ Login controller checks `is_active` status
- ✅ Disabled users cannot log in (403 error with clear message)
- ✅ Status included in all user API responses
- ✅ Status can be updated via user update API

#### Frontend
- ✅ **Account Status** column in HR table showing Active/Disabled badge
- ✅ Toggle switch in Edit User modal to enable/disable accounts
- ✅ Visual warning when disabling an account
- ✅ Color-coded badges (green for active, red for disabled)

### 2. Password Change from Edit Modal

Administrators can now change user passwords:

#### Backend
- ✅ Password change integrated into user update API
- ✅ Only updates password if provided (optional field)
- ✅ Automatic password hashing with bcrypt
- ✅ Secure password handling

#### Frontend
- ✅ **Change Password** toggle in Edit User modal
- ✅ Password visibility toggle (show/hide)
- ✅ Minimum 6 characters validation
- ✅ Optional field - leave blank to keep current password
- ✅ Clear UX with instructions

### 3. Enhanced Edit User Modal

Complete modal with all user management features:

- ✅ All user fields editable (name, email, role, etc.)
- ✅ Work location field
- ✅ Account status toggle with warning
- ✅ Password change section
- ✅ User code display (read-only)
- ✅ Validation for all required fields
- ✅ Loading states and error handling
- ✅ Beautiful, professional UI

## Usage Guide

### Disabling a User Account

1. Navigate to HR page (`/dashboard/hr`)
2. Click the **Edit** icon (pencil) next to the user
3. In the "Account Status" section, toggle the switch to **OFF** (red)
4. A warning will appear explaining the user cannot log in
5. Click "Save Changes"
6. The user will immediately be unable to log in

**Re-enabling**: Just toggle the switch back to ON (green)

### Changing a User's Password

1. Open Edit User modal
2. Toggle the "Change Password" switch to **ON**
3. Enter the new password (minimum 6 characters)
4. Use the eye icon to show/hide the password
5. Click "Save Changes"
6. The user can now log in with the new password

**Note**: Leave the password field blank to keep the current password unchanged.

### What Happens When a User is Disabled

When an account is disabled (`is_active = false`):

1. **Login Blocked**: User receives error message:
   ```
   "Your account has been disabled. Please contact an administrator."
   ```

2. **Existing Sessions**: Any existing login sessions remain active until they expire

3. **Visible in HR**: Account shows "Disabled" badge in red

4. **Data Preserved**: All user data, documents, and history remain intact

5. **Reversible**: Can be re-enabled at any time by toggling status

## API Reference

### Update User (with status and password)

```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "agent",
  "work_location": "Beirut",
  "phone": "+961 70 123 456",
  "is_active": true,          // Toggle status
  "password": "newpassword123" // Optional: change password
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "agent",
    "is_active": true,
    ...
  }
}
```

### Login (checks status)

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Disabled Account):**
```json
{
  "message": "Your account has been disabled. Please contact an administrator."
}
```
HTTP Status: 403 Forbidden

## Database Schema Updates

```sql
-- Added column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Added index
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
```

## Security Considerations

### Password Changes
1. ✅ Passwords are hashed using bcrypt before storage
2. ✅ Never stored in plain text
3. ✅ Minimum 6 character requirement
4. ✅ Only authenticated admins can change passwords
5. ✅ Password visibility toggle for user convenience

### Account Status
1. ✅ Only users with `canManageUsers` permission can modify status
2. ✅ Immediate effect on login attempts
3. ✅ Cannot disable your own account (should add this check)
4. ✅ Audit trail via `updated_at` timestamp

### Recommended Additional Security
- [ ] Add password strength requirements (uppercase, numbers, symbols)
- [ ] Add confirmation dialog when disabling accounts
- [ ] Prevent self-account disabling
- [ ] Add password change notification emails
- [ ] Log all password changes for audit
- [ ] Add "last password changed" timestamp

## Testing Checklist

### User Status
- [x] Create new user (should be active by default)
- [x] Disable user account
- [x] Try to log in as disabled user (should fail)
- [x] Re-enable user account
- [x] Log in as re-enabled user (should work)
- [x] Status badge displays correctly in table

### Password Change
- [x] Change user password
- [x] Log in with new password (should work)
- [x] Log in with old password (should fail)
- [x] Leave password blank (should keep old password)
- [x] Test password validation (< 6 chars)

### UI/UX
- [x] Toggle switches work smoothly
- [x] Warning displays when disabling account
- [x] Password visibility toggle works
- [x] Form validation shows appropriate messages
- [x] Success/error toasts display correctly

## Troubleshooting

### User Can Still Log In After Disabling
- Check database: `SELECT is_active FROM users WHERE id = X`
- Verify backend migration ran successfully
- Clear any cached tokens
- Check server logs for errors

### Password Change Not Working
- Verify password meets minimum requirements (6 chars)
- Check backend logs for hashing errors
- Ensure bcrypt is installed: `npm ls bcrypt`
- Verify user update API is receiving password field

### "Cannot read properties of undefined"
- Ensure all users have `is_active` field
- Run migration: `node backend/add-user-status-migration.js`
- Restart backend server

## Future Enhancements

Potential improvements:
- Password reset functionality (forgot password)
- Password expiration policy
- Force password change on first login
- Two-factor authentication
- Session management (force logout)
- Activity log for account changes
- Bulk enable/disable users
- Password history (prevent reuse)
- Account lockout after failed login attempts
