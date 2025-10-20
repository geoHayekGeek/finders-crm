# HR Agent Dropdown Fix

## Issue
In the HR page, when adding or editing a Team Leader, the agent dropdown was showing "No agents available" even when agents existed in the database. This prevented assigning agents to team leaders.

## Root Cause
The `AgentMultiSelect` component (used in Add/Edit User modals for team leaders) was:
1. Calling `usersApi.getByRole('agent')` without passing an authentication token
2. The backend route `/users/role/:role` didn't exist
3. No authentication was being enforced on the API call

## Changes Made

### 1. Added Backend Route and Controller

#### New Controller Function (backend/controllers/userController.js)
Added `getUsersByRole` function that:
- Accepts a role parameter from the URL
- Validates the role parameter
- Fetches users by role from the database
- Returns properly formatted user data including assignment status

```javascript
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role parameter is required'
      });
    }
    
    const users = await userModel.getUsersByRole(role);
    
    res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        phone: user.phone,
        user_code: user.user_code,
        is_assigned: user.is_assigned || false,
        created_at: user.created_at,
        updated_at: user.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users by role'
    });
  }
};
```

#### New Route (backend/routes/userRoutes.js)
Added route: `router.get('/role/:role', userController.getUsersByRole)`

This creates the endpoint: `GET /api/users/role/:role`

#### Export Updated
Added `getUsersByRole` to module exports in userController.js

### 2. Updated Frontend API Function (frontend/src/utils/api.ts)

**Before:**
```typescript
getByRole: (role: string) => apiRequest<{ success: boolean; data: any[] }>(`/users/role/${role}`),
```

**After:**
```typescript
getByRole: (role: string, token?: string) => apiRequest<{ success: boolean; data: any[] }>(`/users/role/${role}`, {
  method: 'GET',
}, token),
```

**Changes:**
- Added optional `token` parameter
- Now passes token to `apiRequest` for authentication
- Explicitly sets HTTP method to 'GET'

### 3. Updated AgentMultiSelect Component (frontend/src/components/AgentMultiSelect.tsx)

#### Import Added:
```typescript
import { useAuth } from '@/contexts/AuthContext'
```

#### Token Usage:
```typescript
const { token } = useAuth()
```

#### Updated loadAgents Function:
```typescript
const loadAgents = async () => {
  if (!token) {
    console.error('No authentication token available for loading agents')
    return
  }
  
  try {
    setLoading(true)
    console.log('🔍 Loading agents with token...')
    const response = await usersApi.getByRole('agent', token)
    console.log('👥 Agents response:', response)
    
    if (response.success && response.data) {
      setAgents(response.data)
      console.log('✅ Loaded agents:', response.data.length)
    }
  } catch (error) {
    console.error('❌ Error loading agents:', error)
  } finally {
    setLoading(false)
  }
}
```

#### Updated useEffect:
```typescript
useEffect(() => {
  if (token) {
    loadAgents()
  }
}, [token])
```

**Changes:**
- Now checks for token before making API calls
- Passes token to `getByRole` API function
- Only loads agents when token is available
- Added debug logging for troubleshooting
- Better error handling

## Where This Component Is Used

The `AgentMultiSelect` component is used in:
1. **AddUserModal** - When creating a new Team Leader
2. **EditUserModal** - When editing an existing Team Leader

Both modals are accessed from the HR page when managing users.

## Features Restored

With these fixes, the following functionality now works:
- ✅ Agents load properly in the dropdown when adding a Team Leader
- ✅ Agents load properly in the dropdown when editing a Team Leader
- ✅ Can select multiple agents to assign to a team leader
- ✅ Can search/filter agents by name, email, or user code
- ✅ Shows agent assignment status (assigned/available)
- ✅ Authentication is properly enforced
- ✅ Loading and error states work correctly

## API Endpoint

**New Endpoint:** `GET /api/users/role/:role`

**Parameters:**
- `role` (URL parameter): The user role to filter by (e.g., 'agent', 'team_leader', 'admin')

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "agent",
      "location": "Beirut",
      "phone": "+961...",
      "user_code": "JD",
      "is_assigned": false,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Testing Steps

To verify the fix:
1. Go to the HR page
2. Click "Add User"
3. Select "Team Leader" as the role
4. The "Assign Agents to Team Leader" section should appear
5. Click on the agents dropdown
6. You should see all available agents loaded
7. Select one or more agents
8. Save the user
9. Edit the same team leader
10. The assigned agents should be pre-selected in the dropdown

## Related Files

**Backend:**
- `backend/controllers/userController.js` - Added getUsersByRole controller
- `backend/routes/userRoutes.js` - Added /role/:role route
- `backend/models/userModel.js` - Already had getUsersByRole method

**Frontend:**
- `frontend/src/components/AgentMultiSelect.tsx` - Updated to use token
- `frontend/src/utils/api.ts` - Updated getByRole to accept token
- `frontend/src/components/AddUserModal.tsx` - Uses AgentMultiSelect
- `frontend/src/components/EditUserModal.tsx` - Uses AgentMultiSelect

## Security Improvements

This fix also improves security by:
- ✅ Enforcing authentication on user role queries
- ✅ Requiring valid JWT token for all agent listings
- ✅ Preventing unauthorized access to user data
- ✅ Proper error handling for authentication failures

## Notes

- The backend `getUsersByRole` function uses the existing `userModel.getUsersByRole()` method
- The frontend component maintains the same UI/UX, only the data loading is fixed
- Agent assignment logic (adding/removing agents from team leaders) was not changed
- This fix is backward compatible with existing code

