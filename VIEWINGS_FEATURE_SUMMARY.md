# Viewings Feature Implementation Summary

## Overview
A comprehensive Viewings feature has been implemented for the Finders CRM system. This feature allows agents and management to schedule, track, and manage property viewings with leads.

## Backend Implementation ✅

### 1. Database Schema (`backend/database/viewings.sql`)
- **viewings table**: Stores viewing appointments
  - Links to properties, leads, and agents
  - Includes date, time, status, and notes
  - Status options: Scheduled, Completed, Cancelled, No Show, Rescheduled
  
- **viewing_updates table**: Tracks viewing history and updates
  - Linked to viewings
  - Stores update text, date, and creator
  - Supports collaborative note-taking

### 2. Model (`backend/models/viewingModel.js`)
Comprehensive model with methods for:
- CRUD operations (Create, Read, Update, Delete)
- Role-based filtering (agents see own, team leaders see team's, admins see all)
- Filtering and search capabilities
- Update management

### 3. Controller (`backend/controllers/viewingsController.js`)
Handles all viewing operations with:
- Permission-based access control
- Automatic agent assignment for agents/team leaders
- Update tracking
- Statistics generation

### 4. Routes (`backend/routes/viewingsRoutes.js`)
RESTful API endpoints:
- GET `/api/viewings` - Get all viewings (filtered by role)
- GET `/api/viewings/filtered` - Get with filters
- GET `/api/viewings/stats` - Get statistics
- GET `/api/viewings/:id` - Get single viewing
- POST `/api/viewings` - Create viewing
- PUT `/api/viewings/:id` - Update viewing
- DELETE `/api/viewings/:id` - Delete viewing
- POST `/api/viewings/:id/updates` - Add update
- GET `/api/viewings/:id/updates` - Get updates
- DELETE `/api/viewings/:id/updates/:updateId` - Delete update

### 5. Permissions (`backend/middlewares/permissions.js`)
Role-based permissions configured:
- **Admin/Operations Manager/Operations**: Full access
- **Agent Manager**: Full access
- **Team Leader**: Can manage own and team's viewings
- **Agent**: Can manage only their own viewings
- **Accountant**: No access

## Frontend Implementation ✅

### 1. TypeScript Types (`frontend/src/types/viewing.ts`)
Complete type definitions for:
- Viewing interface
- ViewingUpdate interface
- Form data types
- Filter types
- API response types
- Status constants

### 2. API Integration (`frontend/src/utils/api.ts`)
Added `viewingsApi` with all CRUD operations:
- getAll, getWithFilters
- getById, create, update, delete
- getStats, getUpdates, addUpdate, deleteUpdate

### 3. Permissions (`frontend/src/contexts/PermissionContext.tsx`)
Added viewing permissions:
- `canManageViewings`: For creating/editing viewings
- `canViewViewings`: For viewing viewings

### 4. Navigation (`frontend/src/app/dashboard/layout.tsx`)
Added Viewings navigation item:
- Visible to agents, team leaders, and management roles
- Eye icon for visual consistency
- Positioned between Leads and Calendar

## Permission Rules

### Agent Assignment Logic
1. **Agents & Team Leaders**: 
   - Can ONLY create viewings assigned to themselves
   - Automatically assigned when creating a viewing
   - Cannot reassign to other agents

2. **Agent Managers, Operations Manager, Admin Operations**:
   - Can assign viewings to any agent
   - Full flexibility in viewing management

### Visibility Rules
- **Agents**: See only their own viewings
- **Team Leaders**: See their own + team's viewings
- **Management Roles**: See all viewings

## Setup Instructions

### 1. Database Setup
Run the database setup script:
```bash
cd backend
node setup-viewings-db.js
```

This will create:
- `viewings` table
- `viewing_updates` table
- All necessary indexes and constraints

### 2. Backend Routes
Routes are already registered in `backend/routes/index.js`

### 3. Frontend Components (TO BE CREATED)
The following frontend components still need to be created for full functionality:

#### Required Components:
1. **`frontend/src/app/dashboard/viewings/page.tsx`** - Main viewings page
   - Grid and table views
   - Statistics cards
   - Filters
   - Add/Edit/Delete functionality

2. **`frontend/src/components/ViewingsModals.tsx`** - Modal components
   - Add Viewing Modal
   - Edit Viewing Modal
   - View Viewing Modal (with updates section)
   - Delete Viewing Modal

3. **`frontend/src/components/ViewingsCard.tsx`** - Grid view card
   - Display viewing information
   - Quick actions
   - Status indicator

4. **`frontend/src/components/ViewingsTableColumns.tsx`** - Table columns
   - Column definitions for DataTable
   - Sortable columns
   - Action buttons

5. **`frontend/src/components/ViewingsFilters.tsx`** - Filter component
   - Status filter
   - Date range filter
   - Agent filter
   - Property/Lead search

## Features

### Core Functionality
✅ Create viewings with property and lead links
✅ Set viewing date and time
✅ Track viewing status
✅ Add notes to viewings
✅ Add updates to viewings with dates
✅ Role-based access control
✅ Automatic agent assignment for agents/team leaders
✅ Filter and search capabilities

### Status Management
- Scheduled (blue)
- Completed (green)
- Cancelled (red)
- No Show (orange)
- Rescheduled (purple)

### Update System
- Add timestamped updates to viewings
- Track who created each update
- Delete updates (admins only)
- Beautiful UI for update display

## API Examples

### Create a Viewing
```javascript
POST /api/viewings
{
  "property_id": 1,
  "lead_id": 5,
  "agent_id": 3,  // Optional for agents/team leaders (auto-assigned)
  "viewing_date": "2025-02-15",
  "viewing_time": "14:30",
  "status": "Scheduled",
  "notes": "Customer interested in sea view"
}
```

### Add Update to Viewing
```javascript
POST /api/viewings/1/updates
{
  "update_text": "Customer loved the property, requesting second viewing",
  "update_date": "2025-02-15"
}
```

### Filter Viewings
```javascript
GET /api/viewings/filtered?status=Scheduled&date_from=2025-02-01&agent_id=3
```

## Database Schema Details

### viewings Table
```sql
- id (SERIAL PRIMARY KEY)
- property_id (INTEGER, FOREIGN KEY)
- lead_id (INTEGER, FOREIGN KEY)
- agent_id (INTEGER, FOREIGN KEY)
- viewing_date (DATE)
- viewing_time (TIME)
- status (VARCHAR(50))
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### viewing_updates Table
```sql
- id (SERIAL PRIMARY KEY)
- viewing_id (INTEGER, FOREIGN KEY)
- update_text (TEXT)
- update_date (DATE)
- created_by (INTEGER, FOREIGN KEY)
- created_at (TIMESTAMP)
```

## Next Steps

To complete the frontend implementation, create the following components following the patterns established in the Leads and Properties pages:

1. Create `ViewingsPage` - Main page component
2. Create `ViewingsModals` - All modal components
3. Create `ViewingsCard` - Grid view card
4. Create `ViewingsTableColumns` - Table column definitions
5. Create `ViewingsFilters` - Filter component

All backend infrastructure is complete and ready to support the frontend components.

## Testing

### Backend Tests
Test the API endpoints using:
```bash
# Create viewing
curl -X POST http://localhost:10000/api/viewings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"property_id":1,"lead_id":1,"viewing_date":"2025-02-15","viewing_time":"14:30","status":"Scheduled"}'

# Get all viewings
curl http://localhost:10000/api/viewings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add update
curl -X POST http://localhost:10000/api/viewings/1/updates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"update_text":"Great viewing session","update_date":"2025-02-15"}'
```

## Notes

- All backend code follows existing patterns from Leads and Properties
- Permissions are consistent with the existing role system
- Database includes proper indexes for performance
- Update system provides collaborative note-taking
- Status constraints ensure data integrity
- Automatic timestamps track all changes

