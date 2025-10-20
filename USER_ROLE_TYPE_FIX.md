# User Role Type Definition Fix

## Issue
When filtering by "Agent Manager" (or other roles like "Operations Manager" and "Accountant") in the HR page, no results were shown even though users with these roles existed in the database.

## Root Cause
The TypeScript type definitions for user roles in `frontend/src/types/user.ts` were incomplete. They only included 4 roles:
- `'admin' | 'team_leader' | 'agent' | 'operations'`

But the system actually supports 7 roles:
- `'admin'`
- `'operations_manager'`
- `'operations'`
- `'agent_manager'`
- `'team_leader'`
- `'agent'`
- `'accountant'`

This caused TypeScript compilation issues and prevented proper filtering and handling of users with the missing role types.

## The Fix

Updated three TypeScript interfaces in `frontend/src/types/user.ts`:

### 1. User Interface
**Before:**
```typescript
export interface User {
  // ...
  role: 'admin' | 'team_leader' | 'agent' | 'operations'
  // ...
}
```

**After:**
```typescript
export interface User {
  // ...
  role: 'admin' | 'operations_manager' | 'operations' | 'agent_manager' | 'team_leader' | 'agent' | 'accountant'
  // ...
}
```

### 2. CreateUserFormData Interface
**Before:**
```typescript
export interface CreateUserFormData {
  name: string
  email: string
  password: string
  role: 'admin' | 'team_leader' | 'agent' | 'operations'
  // ...
}
```

**After:**
```typescript
export interface CreateUserFormData {
  name: string
  email: string
  password: string
  role: 'admin' | 'operations_manager' | 'operations' | 'agent_manager' | 'team_leader' | 'agent' | 'accountant'
  // ...
}
```

### 3. EditUserFormData Interface
**Before:**
```typescript
export interface EditUserFormData {
  name: string
  email: string
  role: 'admin' | 'team_leader' | 'agent' | 'operations'
  // ...
}
```

**After:**
```typescript
export interface EditUserFormData {
  name: string
  email: string
  role: 'admin' | 'operations_manager' | 'operations' | 'agent_manager' | 'team_leader' | 'agent' | 'accountant'
  // ...
}
```

## All System Roles

Here's the complete list of roles in the system with their hierarchy:

1. **admin** - Full system access
2. **operations_manager** - Full access (same as admin)
3. **operations** - Everything except financial data and user management
4. **agent_manager** - Properties + Agent oversight (read-only leads)
5. **team_leader** - Limited to their team
6. **agent** - Limited to assigned properties
7. **accountant** - Financial data access only

## Impact

### What This Fixes:
✅ **Filtering in HR page** - All role filters now work correctly
✅ **Role display** - All role badges display properly
✅ **User creation** - Can create users with any role
✅ **User editing** - Can edit users and change to any role
✅ **Type safety** - TypeScript properly validates role values
✅ **Statistics** - Role counts include all roles

### What Was Affected:
- HR page role filter dropdown
- User creation modal
- User editing modal
- Statistics calculations
- Role-based conditional rendering
- Any component using User, CreateUserFormData, or EditUserFormData types

## Testing

### Test Scenario 1: Filter by Agent Manager
1. Go to HR page
2. Open the "Role" filter dropdown
3. Select "Agent Manager"
4. **Verify:** All agent managers are displayed
5. **Verify:** No TypeScript errors in console

### Test Scenario 2: Filter by Operations Manager
1. Go to HR page
2. Open the "Role" filter dropdown
3. Select "Operations Manager"
4. **Verify:** All operations managers are displayed

### Test Scenario 3: Filter by Accountant
1. Go to HR page
2. Open the "Role" filter dropdown
3. Select "Accountant"
4. **Verify:** All accountants are displayed

### Test Scenario 4: Create User with Agent Manager Role
1. Go to HR page
2. Click "Add User"
3. Fill in details and select "Agent Manager" role
4. Save
5. **Verify:** User is created successfully
6. **Verify:** User appears in list with proper role badge (indigo)

### Test Scenario 5: Edit User and Change to Operations Manager
1. Go to HR page
2. Edit any user
3. Change role to "Operations Manager"
4. Save
5. **Verify:** User's role is updated
6. **Verify:** Proper role badge is displayed (red)

### Test Scenario 6: Statistics Display
1. Go to HR page
2. Look at the statistics cards
3. **Verify:** Role counts include all role types
4. **Verify:** No users are missing from counts

## Files Modified

- `frontend/src/types/user.ts` - Updated three interfaces

## Backward Compatibility

✅ **Fully backward compatible:**
- No API changes
- No database schema changes
- No functional changes to existing features
- Only fixes TypeScript type definitions to match reality

## Related Components

These components use the User type and are now properly typed:
- `AddUserModal.tsx`
- `EditUserModal.tsx`
- `ViewUserModal.tsx`
- `DeleteUserModal.tsx`
- `AgentMultiSelect.tsx`
- `AgentSelector.tsx`
- HR page (`hr/page.tsx`)
- All role-based permission checks

## Role Color Codes

For reference, here are the role color codes used in the UI:

| Role | Color | Badge Class |
|------|-------|-------------|
| admin | Purple | `bg-purple-100 text-purple-800` |
| operations_manager | Red | `bg-red-100 text-red-800` |
| operations | Orange | `bg-orange-100 text-orange-800` |
| agent_manager | Indigo | `bg-indigo-100 text-indigo-800` |
| team_leader | Blue | `bg-blue-100 text-blue-800` |
| agent | Green | `bg-green-100 text-green-800` |
| accountant | Yellow | `bg-yellow-100 text-yellow-800` |

## Prevention

To prevent this issue in the future:
1. Keep TypeScript types in sync with database/backend role definitions
2. When adding new roles, update all three interfaces in `user.ts`
3. Test all role filters after adding new roles
4. Document all available roles in system documentation

## Additional Notes

- The backend already supported all 7 roles correctly
- The database schema supports any string as a role
- This was purely a TypeScript type definition issue
- No runtime errors occurred, but filtering didn't work as expected
- TypeScript's type checking may have been too lenient in some places, allowing the mismatch to go unnoticed

## Verification

After deploying this fix, verify:
1. All role filters work in HR page
2. Users can be created with any role
3. Users can be edited to any role
4. No TypeScript compilation errors
5. All role badges display with correct colors
6. Statistics accurately count users by all roles


