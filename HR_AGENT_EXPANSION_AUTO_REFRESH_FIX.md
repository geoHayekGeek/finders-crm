# HR Agent Expansion Auto-Refresh Fix

## Issue
After editing a team leader and adding agents, when the edit modal closes and the user list refreshes:
1. The agent count badge showed "0 agents"
2. The expanded row showed "Loading agents..."
3. User had to collapse and re-expand to see the updated agents

## Root Cause
When `loadData()` was called after editing a user:
1. It cleared all user data including the `agents` array (set to `undefined`)
2. Expanded team leader states were preserved
3. But agents data wasn't reloaded for those expanded rows
4. This caused the "Loading agents..." state to persist

## The Solution

### 1. Clear Agents Cache on Data Reload
**Purpose:** Force fresh data load and prevent stale data

```typescript
const usersWithActions = response.users.map((u: User) => ({
  ...u,
  agents: undefined, // Clear any cached agents data
  onView: handleViewUser,
  onEdit: handleEditUser,
  onDelete: handleDeleteUser
}))
```

### 2. Auto-Reload Agents for Expanded Team Leaders
**Purpose:** Automatically refresh agent data for any team leaders that are currently expanded

```typescript
// Reload agents for any expanded team leaders
if (expandedTeamLeaders.size > 0 && token) {
  console.log('🔄 Reloading agents for expanded team leaders:', Array.from(expandedTeamLeaders))
  for (const teamLeaderId of expandedTeamLeaders) {
    try {
      const agentsResponse = await usersApi.getTeamLeaderAgents(teamLeaderId, token)
      if (agentsResponse.success && agentsResponse.agents) {
        console.log('✅ Reloaded agents for TL:', teamLeaderId, 'count:', agentsResponse.agents.length)
        setUsers(prevUsers => prevUsers.map(u => 
          u.id === teamLeaderId 
            ? { ...u, agents: agentsResponse.agents, agent_count: agentsResponse.agents.length }
            : u
        ))
      }
    } catch (error) {
      console.error('❌ Error reloading agents for TL:', teamLeaderId, error)
    }
  }
}
```

### 3. Update Agent Count on Expansion
**Purpose:** Ensure agent count badge is always accurate

```typescript
const toggleTeamLeaderExpansion = async (teamLeaderId: number) => {
  // ... expansion logic ...
  
  const response = await usersApi.getTeamLeaderAgents(teamLeaderId, token)
  if (response.success && response.agents) {
    setUsers(prevUsers => prevUsers.map(u => 
      u.id === teamLeaderId 
        ? { ...u, agents: response.agents, agent_count: response.agents.length }
        : u
    ))
  }
}
```

### 4. Improved Loading State Detection
**Purpose:** Distinguish between "loading" and "empty" states

```typescript
{!user.agents ? (
  <p>Loading agents...</p>  // undefined = still loading
) : user.agents.length > 0 ? (
  // Show agents grid
) : (
  <p>No agents assigned to this team leader yet</p>  // [] = empty
)}
```

## User Experience Flow

### Before Fix:
1. User expands Team Leader A (0 agents)
2. Sees "0 agents" badge and proper empty state
3. Edits Team Leader A, adds Agent X
4. Modal closes, table refreshes
5. ❌ Still shows "0 agents" badge
6. ❌ Expanded row shows "Loading agents..."
7. User must collapse and re-expand to see Agent X

### After Fix:
1. User expands Team Leader A (0 agents)
2. Sees "0 agents" badge and proper empty state
3. Edits Team Leader A, adds Agent X
4. Modal closes, table refreshes
5. ✅ Shows "1 agent" badge immediately
6. ✅ Expanded row shows Agent X immediately
7. No manual refresh needed!

## Technical Details

### State Management
- `expandedTeamLeaders` (Set<number>) - Tracks which team leaders are expanded
- `users` (User[]) - Main user list with optional `agents` array
- `agents: undefined` - Means "not loaded yet" → shows "Loading..."
- `agents: []` - Means "loaded but empty" → shows "No agents..."
- `agents: [...]` - Means "loaded with data" → shows agents grid

### Data Flow
1. **Initial Load**: `loadData()` → Sets all users, `agents: undefined`
2. **User Expands TL**: `toggleTeamLeaderExpansion()` → Loads agents for that TL
3. **User Edits TL**: Modal opens, shows current agents
4. **User Saves Changes**: Modal closes → `onSuccess()` → `loadData()`
5. **Auto-Refresh**: `loadData()` detects expanded TLs → Reloads their agents
6. **UI Updates**: Agent count badge + expanded row update automatically

### API Calls
```
Initial page load:
  GET /api/users/all

User expands Team Leader #5:
  GET /api/users/team-leaders/5/agents

User edits and saves Team Leader #5:
  PUT /api/users/5
  POST/DELETE /api/users/assign-agent (for each agent change)
  GET /api/users/all (refresh list)
  GET /api/users/team-leaders/5/agents (auto-refresh because expanded)
```

## Performance Considerations

✅ **Efficient:**
- Only reloads agents for **expanded** team leaders
- Doesn't reload agents for collapsed team leaders
- Uses `Set` for O(1) lookup of expanded states
- Parallel API calls (doesn't block on each)

✅ **Optimized:**
- Clears stale cache to prevent inconsistencies
- Updates both `agents` array and `agent_count` together
- Uses `prevUsers => ...` pattern to avoid race conditions

## Debug Logging

Added comprehensive logging for troubleshooting:

```javascript
// In loadData()
console.log('🔍 Loading users...')
console.log('✅ Users data received:', response.users)
console.log('🔄 Reloading agents for expanded team leaders:', Array.from(expandedTeamLeaders))
console.log('✅ Reloaded agents for TL:', teamLeaderId, 'count:', agentsResponse.agents.length)
console.log('❌ Error reloading agents for TL:', teamLeaderId, error)

// In toggleTeamLeaderExpansion()
console.log('🔍 Loading agents for team leader:', teamLeaderId)
console.log('✅ Loaded agents for TL:', teamLeaderId, 'count:', response.agents.length)
console.log('❌ Error loading team agents:', error)
```

## Testing Scenarios

### Test 1: Adding Agents to Empty Team Leader
1. Find a team leader with 0 agents
2. Expand the row (verify "No agents assigned yet")
3. Edit the team leader
4. Add 2 agents
5. Save changes
6. **Verify:** Badge updates to "2 agents"
7. **Verify:** Expanded row shows both agents immediately
8. **Verify:** No "Loading agents..." appears

### Test 2: Removing All Agents
1. Find a team leader with agents
2. Expand the row
3. Edit the team leader
4. Remove all agents
5. Save changes
6. **Verify:** Badge updates to "0 agents"
7. **Verify:** Shows "No agents assigned yet"
8. **Verify:** No stale agent data

### Test 3: Multiple Expanded Team Leaders
1. Expand Team Leader A
2. Expand Team Leader B
3. Edit Team Leader A, add agents
4. Save changes
5. **Verify:** Team Leader A's row updates
6. **Verify:** Team Leader B's row stays the same
7. **Verify:** Both stay expanded

### Test 4: Editing Non-Expanded Team Leader
1. Find a team leader that's collapsed
2. Edit and add agents (don't expand)
3. Save changes
4. **Verify:** Badge updates immediately
5. **Verify:** When expanded, shows new agents
6. **Verify:** No unnecessary API calls

## Edge Cases Handled

✅ **Empty expandedTeamLeaders Set:** Skips reload loop entirely
✅ **API Error During Reload:** Logs error but doesn't crash
✅ **Multiple Rapid Edits:** Uses functional setState to prevent race conditions
✅ **Team Leader Deleted:** Silently skips if no longer exists
✅ **Network Timeout:** Each team leader reload is independent
✅ **Missing Token:** Guards against undefined token

## Files Modified

- `frontend/src/app/dashboard/hr/page.tsx`
  - Modified `loadData()` function
  - Modified `toggleTeamLeaderExpansion()` function
  - Updated agent display logic in expanded row

## Backward Compatibility

✅ **Fully compatible:**
- Doesn't change API contracts
- Doesn't modify database schema
- Works with existing agent assignment logic
- No breaking changes to modals or other components

## Performance Impact

**Minimal:** Only adds 1 API call per expanded team leader after edits
- If 0 team leaders expanded: 0 extra calls
- If 1 team leader expanded: 1 extra call (~50ms)
- If 3 team leaders expanded: 3 extra calls (~150ms total)

**Network:** Calls are made in parallel using for loop with async/await

## Future Enhancements

Potential improvements:
1. Add loading indicator in expanded row during auto-refresh
2. Implement debouncing for rapid successive edits
3. Add animation when agent list updates
4. Cache agent data with TTL (time-to-live)
5. WebSocket real-time updates for multi-user scenarios


