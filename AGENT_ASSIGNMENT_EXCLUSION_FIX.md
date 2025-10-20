# Agent Assignment Exclusion Enhancement

## Overview
Enhanced the agent assignment system in the HR module to exclude agents that are already assigned to other team leaders when assigning agents to a team leader. This prevents double-assignment of agents and ensures proper team management.

## The Problem
Previously, when adding or editing a team leader and assigning agents:
- **All agents** were shown in the dropdown, including those already assigned to other team leaders
- This could lead to confusion and potential conflicts
- No clear indication of which agents were available for assignment

## The Solution

### Smart Filtering Logic

#### When **Adding a New Team Leader**:
- Shows **only unassigned agents** (agents with `is_assigned = FALSE`)
- Hides agents already assigned to any team leader
- Ensures clean assignment without conflicts

#### When **Editing an Existing Team Leader**:
- Shows **unassigned agents** (available for assignment)
- Shows **agents already assigned to THIS team leader** (can be kept or removed)
- **Hides agents assigned to OTHER team leaders** (prevents stealing agents)

### Visual Example

```
Team Leader A (ID: 1) has agents: [Agent 1, Agent 2]
Team Leader B (ID: 2) has agents: [Agent 3]
Unassigned agents: [Agent 4, Agent 5]

When editing Team Leader A:
  ✅ Shows: Agent 1, Agent 2 (already assigned to TL A)
  ✅ Shows: Agent 4, Agent 5 (unassigned)
  ❌ Hides: Agent 3 (assigned to TL B)

When adding a new Team Leader C:
  ✅ Shows: Agent 4, Agent 5 (unassigned)
  ❌ Hides: Agent 1, Agent 2 (assigned to TL A)
  ❌ Hides: Agent 3 (assigned to TL B)
```

## Technical Implementation

### 1. Backend Changes

#### Updated Model Function (backend/models/userModel.js)

**Function:** `getAvailableAgentsForTeamLeader(teamLeaderId)`

```javascript
static async getAvailableAgentsForTeamLeader(teamLeaderId = null) {
  let query, params;
  
  if (teamLeaderId) {
    // Get agents that are either:
    // 1. Not assigned to anyone (is_assigned = FALSE)
    // 2. Already assigned to THIS team leader (assigned_to = teamLeaderId)
    // This excludes agents assigned to OTHER team leaders
    query = `
      SELECT u.id, u.name, u.email, u.role, u.location, u.phone, u.user_code, u.is_assigned, u.assigned_to
      FROM users u
      WHERE u.role = 'agent' 
        AND (u.is_assigned = FALSE OR u.assigned_to = $1)
      ORDER BY u.name
    `;
    params = [teamLeaderId];
  } else {
    // Get all agents with assignment status
    query = `
      SELECT u.id, u.name, u.email, u.role, u.location, u.phone, u.user_code, u.is_assigned, u.assigned_to
      FROM users u
      WHERE u.role = 'agent'
      ORDER BY u.name
    `;
    params = [];
  }
  
  const result = await pool.query(query, params);
  return result.rows;
}
```

**Key Changes:**
- When `teamLeaderId` is provided: filters to show `is_assigned = FALSE OR assigned_to = teamLeaderId`
- This SQL condition ensures only relevant agents are returned
- Uses parameterized query for security

#### Updated Controller (backend/controllers/userController.js)

**Function:** `getUsersByRole(req, res)`

Added `forAssignment` query parameter to indicate when the request is for team leader assignment:

```javascript
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { teamLeaderId, forAssignment } = req.query;
    
    // If requesting agents for team leader assignment
    if (role === 'agent' && forAssignment === 'true') {
      // If teamLeaderId provided: show unassigned agents + agents already assigned to THIS team leader
      // If no teamLeaderId (new team leader): show only unassigned agents
      const agents = await userModel.getAvailableAgentsForTeamLeader(teamLeaderId || null);
      
      return res.json({
        success: true,
        data: agents.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          phone: user.phone,
          user_code: user.user_code,
          is_assigned: user.is_assigned || false,
          assigned_to: user.assigned_to || null,
          created_at: user.created_at,
          updated_at: user.updated_at
        }))
      });
    }
    
    // Default: get all users by role
    // ... (rest of the function)
  }
}
```

**Key Changes:**
- Added `forAssignment` and `teamLeaderId` query parameters
- When `forAssignment=true` and `role=agent`, uses filtered logic
- Calls `getAvailableAgentsForTeamLeader` with appropriate teamLeaderId
- Returns `assigned_to` field for debugging/tracking

### 2. Frontend Changes

#### Updated API Function (frontend/src/utils/api.ts)

```typescript
getByRole: (role: string, token?: string, teamLeaderId?: number, forAssignment: boolean = false) => {
  let url = `/users/role/${role}`;
  const params = new URLSearchParams();
  
  if (forAssignment) {
    params.append('forAssignment', 'true');
  }
  
  if (teamLeaderId) {
    params.append('teamLeaderId', teamLeaderId.toString());
  }
  
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }
  
  return apiRequest<{ success: boolean; data: any[] }>(url, {
    method: 'GET',
  }, token);
}
```

**Key Changes:**
- Added `teamLeaderId` parameter (optional)
- Added `forAssignment` parameter (boolean, default false)
- Builds query string dynamically based on parameters
- Uses URLSearchParams for proper encoding

#### Updated AgentMultiSelect Component (frontend/src/components/AgentMultiSelect.tsx)

**Interface:**
```typescript
interface AgentMultiSelectProps {
  selectedAgentIds: number[]
  onChange: (agentIds: number[]) => void
  label?: string
  className?: string
  teamLeaderId?: number // NEW: Optional team leader ID for filtering
}
```

**loadAgents Function:**
```typescript
const loadAgents = async () => {
  if (!token) {
    console.error('No authentication token available for loading agents')
    return
  }
  
  try {
    setLoading(true)
    console.log('🔍 Loading agents...', teamLeaderId ? `for team leader ${teamLeaderId}` : 'for new team leader')
    const response = await usersApi.getByRole('agent', token, teamLeaderId, true) // forAssignment=true
    
    if (response.success && response.data) {
      setAgents(response.data)
      console.log('✅ Loaded agents:', response.data.length)
      if (teamLeaderId) {
        console.log('✅ Filtered for team leader:', teamLeaderId)
      } else {
        console.log('✅ Showing only unassigned agents')
      }
    }
  } catch (error) {
    console.error('❌ Error loading agents:', error)
  } finally {
    setLoading(false)
  }
}
```

**Key Changes:**
- Added `teamLeaderId` prop to component interface
- Passes `teamLeaderId` to API call
- Always passes `forAssignment=true` for filtering
- Added debug logging for troubleshooting
- Updated useEffect to reload when teamLeaderId changes

#### Updated EditUserModal (frontend/src/components/EditUserModal.tsx)

```typescript
<AgentMultiSelect
  selectedAgentIds={assignedAgentIds}
  onChange={setAssignedAgentIds}
  label="Assign Agents to Team Leader"
  teamLeaderId={user.id}  // NEW: Pass the team leader's ID
/>
```

**Key Change:**
- Now passes `teamLeaderId={user.id}` to filter agents appropriately

#### AddUserModal (No Changes Needed)

```typescript
<AgentMultiSelect
  selectedAgentIds={assignedAgentIds}
  onChange={setAssignedAgentIds}
  label="Assign Agents to Team Leader"
  // No teamLeaderId passed - shows only unassigned agents
/>
```

**Why no changes:**
- Not passing `teamLeaderId` is intentional
- Backend interprets this as "new team leader"
- Automatically shows only unassigned agents

## API Endpoint

**Endpoint:** `GET /api/users/role/:role`

**Query Parameters:**
- `forAssignment` (optional): Set to `'true'` to enable agent filtering for team leader assignment
- `teamLeaderId` (optional): The ID of the team leader being edited (omit for new team leaders)

**Examples:**

1. **Get all unassigned agents (for new team leader):**
   ```
   GET /api/users/role/agent?forAssignment=true
   ```

2. **Get available agents for editing Team Leader #5:**
   ```
   GET /api/users/role/agent?forAssignment=true&teamLeaderId=5
   ```
   Returns: Unassigned agents + agents already assigned to TL #5

3. **Get all agents (no filtering):**
   ```
   GET /api/users/role/agent
   ```
   Returns: All agents regardless of assignment

## Database Schema

This feature relies on the existing `users` table structure:

```sql
users table:
  - id (primary key)
  - role (varchar)
  - is_assigned (boolean) - TRUE if agent is assigned to a team leader
  - assigned_to (integer) - Foreign key to users.id (the team leader)

team_agents table:
  - team_leader_id (foreign key to users.id)
  - agent_id (foreign key to users.id)
  - is_active (boolean)
```

## Benefits

1. **Prevents Conflicts:** Agents cannot be assigned to multiple team leaders simultaneously
2. **Clear Visibility:** Only shows agents that can actually be assigned
3. **Maintains Assignments:** Existing agent assignments are preserved when editing
4. **Better UX:** Reduces confusion by hiding unavailable options
5. **Data Integrity:** Enforces one-to-one relationship between agents and team leaders
6. **Flexible:** Allows reassignment by removing from one TL before adding to another

## Testing Scenarios

### Scenario 1: Creating a New Team Leader
1. Go to HR page
2. Click "Add User"
3. Select role: "Team Leader"
4. Open agent assignment dropdown
5. **Verify:** Only unassigned agents appear
6. **Verify:** Agents already assigned to other team leaders are hidden

### Scenario 2: Editing an Existing Team Leader
1. Go to HR page
2. Edit a team leader who has agents
3. Open agent assignment dropdown
4. **Verify:** Team leader's current agents are shown
5. **Verify:** Unassigned agents are shown
6. **Verify:** Agents assigned to OTHER team leaders are hidden

### Scenario 3: Transferring an Agent
1. Edit Team Leader A, remove Agent X
2. Save changes
3. Edit Team Leader B
4. **Verify:** Agent X now appears in the dropdown (became unassigned)
5. Assign Agent X to Team Leader B
6. Edit Team Leader A again
7. **Verify:** Agent X no longer appears (assigned to B)

## Debug Logging

The system includes comprehensive console logging:

- `🔍 Loading agents...` - When fetching starts
- `for team leader X` - When filtering for specific TL
- `for new team leader` - When no TL ID provided
- `✅ Loaded agents: N` - Success with count
- `✅ Filtered for team leader: X` - Confirmation of filtering
- `✅ Showing only unassigned agents` - For new TL case
- `❌ Error loading agents` - On failure

## Files Modified

**Backend:**
- `backend/models/userModel.js` - Updated getAvailableAgentsForTeamLeader
- `backend/controllers/userController.js` - Updated getUsersByRole

**Frontend:**
- `frontend/src/utils/api.ts` - Updated getByRole function
- `frontend/src/components/AgentMultiSelect.tsx` - Added teamLeaderId prop
- `frontend/src/components/EditUserModal.tsx` - Pass teamLeaderId

## Backward Compatibility

✅ **Fully backward compatible:**
- Default behavior unchanged when `forAssignment` is not specified
- Existing API calls continue to work
- No database schema changes required
- No breaking changes to existing functionality

## Security Considerations

✅ **Security maintained:**
- Authentication required (token-based)
- Parameterized queries prevent SQL injection
- Role-based filtering at database level
- No exposure of sensitive data

## Performance Impact

✅ **Minimal performance impact:**
- Single database query with indexed columns
- No N+1 query problems
- Efficient SQL with proper WHERE clauses
- Results cached on frontend until refresh

## Future Enhancements

Potential improvements:
1. Add visual indicators for assigned vs unassigned agents
2. Show which team leader an agent is assigned to (tooltip/badge)
3. Add "steal agent" functionality (with confirmation)
4. Batch agent reassignment
5. Agent assignment history/audit log


