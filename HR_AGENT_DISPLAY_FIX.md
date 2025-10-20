# HR Agent Display Fix

## Issue
In the HR page, agents under team leaders were not being displayed, neither in the main table nor in the view modal.

## Changes Made

### Backend Changes

#### 1. Enhanced `getAllUsers` Query (backend/models/userModel.js)
- Added `agent_count` field to the SQL query that returns the number of active agents assigned to each team leader
- The count is only calculated for users with the `team_leader` role

```sql
SELECT 
  u.id, u.name, u.email, u.role, u.location, u.phone, u.dob, 
  u.work_location, u.user_code, u.is_assigned, u.assigned_to, 
  u.is_active, u.created_at, u.updated_at,
  CASE 
    WHEN u.role = 'team_leader' THEN (
      SELECT COUNT(*)::integer 
      FROM team_agents ta 
      WHERE ta.team_leader_id = u.id AND ta.is_active = TRUE
    )
    ELSE NULL
  END as agent_count
FROM users u 
ORDER BY u.created_at DESC
```

#### 2. Updated Controller Response (backend/controllers/userController.js)
- Modified `getAllUsers` controller to include `agent_count` in the response
- This allows the frontend to display the number of agents without making additional API calls

### Frontend Changes

#### 1. Updated User Type (frontend/src/types/user.ts)
- Added `agent_count?: number | null` field
- Added `agents?: User[]` field for storing loaded agent data

#### 2. Enhanced ViewUserModal (frontend/src/components/ViewUserModal.tsx)
- Added state management for loading agents
- Implemented `loadTeamAgents()` function that fetches agents when viewing a team leader
- Added a new "Team Agents" section that displays:
  - Total number of agents
  - List of agents with their names, emails, and user codes
  - Loading state while fetching
  - Empty state when no agents are assigned

#### 3. Enhanced HR Page (frontend/src/app/dashboard/hr/page.tsx)
- Added `expandedTeamLeaders` state to track which team leader rows are expanded
- Added `toggleTeamLeaderExpansion()` function that:
  - Toggles the expansion state
  - Loads agents for the team leader if not already loaded
  - Caches the loaded agents to avoid unnecessary API calls
- Updated the Name column to show:
  - Expand/collapse chevron button for team leaders
  - Agent count badge next to the team leader name
- Replaced `DataTable` component with custom table rendering to support expandable rows
- Added expandable row rendering that displays:
  - All agents under the team leader in a responsive grid
  - Agent cards with avatar, name, email, and user code
  - Loading state while fetching agents

## Features Added

### 1. Visual Indicators
- Team leaders now show a badge with agent count (e.g., "3 agents")
- Chevron icons (right/down) indicate expandable rows
- Color-coded badges for better visual distinction

### 2. Expandable Rows
- Click the chevron button to expand/collapse agent lists
- Agents are displayed in a responsive grid (1-3 columns depending on screen size)
- Each agent card shows:
  - Avatar with green background
  - Name and email
  - User code badge

### 3. View Modal Enhancement
- When viewing a team leader, the modal automatically loads and displays their agents
- Shows agent count and detailed list
- Provides "No agents assigned yet" message for team leaders without agents

## How to Use

### Viewing Agents in the Table
1. Navigate to the HR page
2. Find a team leader in the users table
3. Click the chevron icon next to the team leader's name
4. The row will expand to show all assigned agents

### Viewing Agents in the Modal
1. Navigate to the HR page
2. Click the "View" (eye icon) button for a team leader
3. The modal will automatically load and display the team's agents
4. Agents are shown in the "Team Agents" section

## API Endpoints Used
- `GET /api/users` - Returns all users with agent counts for team leaders
- `GET /api/users/team-leaders/:teamLeaderId/agents` - Returns agents for a specific team leader

## Notes
- Agent data is cached after first load to improve performance
- The system uses the `team_agents` table to maintain team leader-agent relationships
- Only active assignments are counted and displayed
- The implementation is backward compatible with existing code

## Testing
Both backend and frontend servers have been started. You can test the functionality by:
1. Opening the application at http://localhost:3000
2. Logging in with appropriate credentials
3. Navigating to the HR page
4. Testing the expand/collapse functionality for team leaders
5. Opening the view modal for a team leader to see agents


