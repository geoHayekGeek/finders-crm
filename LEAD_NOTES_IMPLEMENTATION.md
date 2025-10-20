# Lead Notes & Agent/Team Leader Access Implementation

## Overview
Implemented agent-specific notes for leads with role-based permissions. Agents and team leaders can now access their assigned leads with limited viewing/editing permissions, while maintaining their own private notes.

## ✅ Completed Backend Changes

### 1. Database Schema
**File:** `backend/database/lead_notes.sql`

- Created `lead_notes` table with agent-specific notes
- Each agent has their own note per lead (UNIQUE constraint on lead_id + agent_id)
- Notes persist even when leads are reassigned
- Automatic timestamp management via triggers

### 2. Leads Model Updates
**File:** `backend/models/leadsModel.js`

Added methods:
- `getLeadNotes(leadId, userId, userRole)` - Fetches notes based on role permissions
  - Admin/operations/operations_manager: See ALL notes
  - Agents/team_leaders: See only their own notes
- `upsertLeadNote(leadId, agentId, noteText)` - Add or update note (upsert operation)
- `deleteLeadNote(leadId, agentId)` - Delete agent's own note
- `getLeadsWithNotes(leads, userId, userRole)` - Attach notes to lead objects

### 3. Leads Controller Updates
**File:** `backend/controllers/leadsController.js`

Updated methods:
- `getAllLeads()` - Now includes agent_notes and filters data for agents/team leaders
  - Agents/team leaders only see: id, date, customer_name, phone_number, agent_id, status, agent_notes
  - All other fields hidden for agents/team leaders
- `getLeadsWithFilters()` - Same data filtering applied
- `getLeadById()` - Includes notes and applies data filtering

New endpoints:
- `upsertLeadNote(req, res)` - POST `/api/leads/:id/notes`
- `deleteLeadNote(req, res)` - DELETE `/api/leads/:id/notes`
- `getLeadNotesById(req, res)` - GET `/api/leads/:id/notes`

### 4. Routes
**File:** `backend/routes/leadsRoutes.js`

Added routes:
```javascript
GET    /api/leads/:id/notes
POST   /api/leads/:id/notes
DELETE /api/leads/:id/notes
```

## ✅ Completed Frontend Changes

### 1. TypeScript Types
**File:** `frontend/src/types/leads.ts`

Added:
```typescript
export interface LeadNote {
  id: number
  lead_id: number
  agent_id: number
  note_text: string
  created_at: string
  updated_at: string
  agent_name?: string
  agent_role?: string
}

// Added to Lead interface:
agent_notes?: LeadNote[]
```

### 2. Notes Component
**File:** `frontend/src/components/LeadNotesSection.tsx` (NEW)

Features:
- ✅ Expandable/collapsible section (doesn't take much space when collapsed)
- ✅ Beautiful gradient header with note count badge
- ✅ Agent name labels with role-colored badges
- ✅ "You" badge for current user's notes
- ✅ Time ago formatting ("2h ago", "3d ago", etc.)
- ✅ Inline editing for agents/team leaders (can only edit their own note)
- ✅ Save/Cancel buttons
- ✅ Different background colors for own vs. other notes
- ✅ Read-only view for admin/operations (see all notes)
- ✅ Write access for agents/team leaders (edit own note only)

### 3. API Utilities
**File:** `frontend/src/utils/api.ts`

Added to `leadsApi`:
```typescript
getNotes: (leadId, token) => ...
saveNote: (leadId, noteText, token) => ...
deleteNote: (leadId, token) => ...
```

## 🚧 Remaining Frontend Work

### Todo: Update LeadsModals Component
**File:** `frontend/src/components/LeadsModals.tsx`

#### View Modal
- [ ] Import `LeadNotesSection` component
- [ ] Add notes section below lead details
- [ ] Pass props: `notes={viewingLead?.agent_notes || []}`, `canEdit={false}`, etc.

#### Edit Modal
- [ ] For agents/team leaders:
  - [ ] Hide all fields except notes section (make them read-only display)
  - [ ] Show customer_name, phone_number, date as read-only text
  - [ ] Show only the `LeadNotesSection` as editable
  - [ ] Remove "Save" button for lead data (not needed for agents/team leaders)
- [ ] For admin/operations:
  - [ ] Keep all fields editable
  - [ ] Add notes section at the bottom
- [ ] Add `onSaveNote` handler that calls `leadsApi.saveNote()`

### Todo: Update Leads Page
**File:** `frontend/src/app/dashboard/leads/page.tsx`

- [ ] Handle `userRole` from API response
- [ ] Store user role in state
- [ ] Pass user role to modals
- [ ] For agents/team leaders editing: Only show notes section
- [ ] Refresh leads after note is saved

### Todo: Update Leads Card
**File:** `frontend/src/components/LeadsCard.tsx`

- [ ] Add small note indicator/badge showing note count
- [ ] Show "📝" icon if user has added a note

## Permission Rules

| Role | View Leads | See Fields | Edit Fields | See Notes | Edit Notes |
|------|------------|------------|-------------|-----------|------------|
| Admin | All | All | All | All agents' notes | Own notes |
| Operations | All | All | All | All agents' notes | Own notes |
| Operations Manager | All | All | All | All agents' notes | Own notes |
| Agent Manager | All | All | All | All agents' notes | Own notes |
| Agent | Assigned only | Limited* | Notes only | Own notes only | Own notes |
| Team Leader | Assigned only | Limited* | Notes only | Own notes only | Own notes |

\* Limited fields: `id`, `date`, `customer_name`, `phone_number`, `agent_id`, `status`, `agent_notes`

## Data Flow

### When Agent Adds Note
```
1. Agent opens lead (assigned to them)
2. Expands notes section
3. Clicks "Add Note"
4. Types note and clicks "Save"
5. POST /api/leads/:id/notes { note_text: "..." }
6. Backend creates/updates note in lead_notes table
7. Frontend refreshes lead data
8. Note appears in collapsed notes section
```

### When Lead is Reassigned
```
1. Admin changes agent_id from Agent A to Agent B
2. Agent A can no longer see the lead
3. Agent A's note remains in database but is not visible to Agent B
4. Agent B sees the lead but cannot see Agent A's notes
5. Agent B can add their own new note
6. Admin can see both Agent A's and Agent B's notes
```

## UI/UX Features

### Notes Section Design
- **Collapsed State**: Shows "Agent Notes (2)" with expand/collapse icon
- **Expanded State**: 
  - For agents: "Add Note" or "Edit My Note" button
  - List of notes with:
    - Agent name + role badge
    - "You" badge for own notes
    - Time ago (2h ago, 3d ago)
    - Note content with proper formatting
    - Different background (indigo for own, gray for others)

### Color Coding
- **Admin**: Red badge
- **Operations**: Blue badge
- **Operations Manager**: Purple badge
- **Agent**: Green badge
- **Team Leader**: Orange badge
- **Own Note**: Indigo background
- **Other's Note**: Gray background

## Database Schema

```sql
lead_notes
├── id (PK)
├── lead_id (FK → leads.id)
├── agent_id (FK → users.id)
├── note_text (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
└── UNIQUE(lead_id, agent_id)
```

## API Endpoints

### Get Lead Notes
```
GET /api/leads/:id/notes
Response: { success: true, data: [LeadNote] }
```

### Save/Update Note
```
POST /api/leads/:id/notes
Body: { note_text: "..." }
Response: { success: true, data: LeadNote, message: "Note saved successfully" }
```

### Delete Note
```
DELETE /api/leads/:id/notes
Response: { success: true, message: "Note deleted successfully" }
```

## Testing Checklist

### Backend
- [x] Database migration runs successfully
- [x] Notes table created with proper indexes
- [x] Can create/update notes via API
- [x] Role-based permissions work correctly
- [x] Agents see only their own notes
- [x] Admin sees all notes
- [x] Data filtering works for agents/team leaders

### Frontend
- [x] Notes component displays correctly
- [x] Expandable/collapsible works
- [x] Time ago formatting works
- [x] Role badges show correct colors
- [ ] Can add/edit notes in modal
- [ ] Can save notes successfully
- [ ] Agents/team leaders can't edit other fields
- [ ] Admin can edit all fields + see all notes

## Next Steps

1. **Complete LeadsModals Integration**:
   - Add LeadNotesSection to View and Edit modals
   - Restrict editing for agents/team leaders
   - Add save note handler

2. **Update Leads Page**:
   - Handle user role from API
   - Refresh after note save
   - Pass role context to modals

3. **Add Visual Indicators**:
   - Note count badge on lead cards
   - 📝 icon if user has added note

4. **Testing**:
   - Test as agent (limited access)
   - Test as team leader (limited access)
   - Test as admin (full access)
   - Test lead reassignment (note persistence)

5. **Documentation**:
   - Update user guide
   - Add screenshots
   - Document permission matrix

## Files Modified

### Backend
- ✅ `backend/database/lead_notes.sql` (NEW)
- ✅ `backend/models/leadsModel.js`
- ✅ `backend/controllers/leadsController.js`
- ✅ `backend/routes/leadsRoutes.js`

### Frontend
- ✅ `frontend/src/types/leads.ts`
- ✅ `frontend/src/components/LeadNotesSection.tsx` (NEW)
- ✅ `frontend/src/utils/api.ts`
- ⏳ `frontend/src/components/LeadsModals.tsx` (IN PROGRESS)
- ⏳ `frontend/src/app/dashboard/leads/page.tsx` (TODO)
- ⏳ `frontend/src/components/LeadsCard.tsx` (TODO)

---

**Status**: Backend Complete ✅ | Frontend 60% Complete ⏳  
**Last Updated**: October 18, 2025

