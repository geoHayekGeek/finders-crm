# Lead Referrals System - Custom Referral Support

## Overview
The Lead Referrals system now supports both **employee referrals** (internal agents) and **custom referrals** (external individuals), matching the functionality of the Property Referrals system.

## Features

### 1. Employee Referrals
- Track referrals from internal agents
- Agent selected from dropdown
- Automatically links to user record (commission tracking)
- Agent name pulled from database

### 2. Custom Referrals
- Track referrals from external individuals
- Custom name input
- No agent_id linkage (no commission)
- Used for tracking external referral sources

### 3. Automatic Referral Tracking
When a lead is assigned to an agent, a referral record is automatically created.

### 4. Manual Referral Management
Authorized users can manually add, edit, and delete referrals for leads.

### 5. External Referral Logic (1-Month Rule)
When a lead is reassigned to a different agent:
- If the previous referral is **within 1 month**: remains internal (commission still earned)
- If the previous referral is **over 1 month**: marked as external (no commission)

## Database Schema

### lead_referrals Table

```sql
CREATE TABLE lead_referrals (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  agent_id INTEGER,                    -- Nullable for custom referrals
  name VARCHAR(255) NOT NULL,          -- Agent name or custom name
  type VARCHAR(20) NOT NULL DEFAULT 'employee',  -- 'employee' or 'custom'
  referral_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  external BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Key Fields

- **name**: The name of the referrer (agent name for employee, custom name for custom)
- **type**: Either 'employee' (internal agent) or 'custom' (external person)
- **agent_id**: Only populated for employee referrals, null for custom
- **external**: When true, indicates the referral no longer earns commission

### Indexes

```sql
CREATE INDEX idx_lead_referrals_lead_id ON lead_referrals(lead_id);
CREATE INDEX idx_lead_referrals_agent_id ON lead_referrals(agent_id);
CREATE INDEX idx_lead_referrals_date ON lead_referrals(referral_date);
CREATE INDEX idx_lead_referrals_external ON lead_referrals(external);
CREATE INDEX idx_lead_referrals_type ON lead_referrals(type);
```

## Backend Implementation

### LeadReferral Model (`backend/models/leadReferralModel.js`)

#### Key Methods

```javascript
// Create a new referral (employee or custom)
static async createReferral(leadId, agentId, name, type, referralDate)

// Get all referrals for a lead
static async getReferralsByLeadId(leadId)

// Process lead reassignment (1-month rule)
static async processLeadReassignment(leadId, newAgentId, previousAgentId)

// Get referral statistics for an agent
static async getReferralStats(agentId)

// Delete a referral
static async deleteReferral(referralId)
```

### API Endpoints (`backend/routes/leadsRoutes.js`)

```javascript
// Get referrals for a lead
GET /api/leads/:id/referrals

// Add a referral to a lead (manual)
POST /api/leads/:id/referrals
Body: { name, type, employee_id?, date }

// Delete a referral from a lead
DELETE /api/leads/:id/referrals/:referralId

// Get referral statistics for an agent
GET /api/leads/agent/:agentId/referral-stats
```

### Controller (`backend/controllers/leadsController.js`)

#### Automatic Referral Creation
When a lead is created with an agent assigned:
```javascript
if (agent_id) {
  const agentName = getAgentName(agent_id);
  await LeadReferral.createReferral(leadId, agent_id, agentName, 'employee');
}
```

#### Manual Referral Addition
```javascript
// Request body
{
  "name": "John Doe",
  "type": "employee",  // or "custom"
  "employee_id": 123,  // Required for employee, null for custom
  "date": "2025-10-19"
}
```

#### Lead Reassignment
When a lead's agent is changed:
```javascript
await LeadReferral.processLeadReassignment(leadId, newAgentId, oldAgentId);
// Automatically handles the 1-month rule
```

## Frontend Implementation

### LeadReferralSelector Component

Location: `frontend/src/components/LeadReferralSelector.tsx`

#### Features

1. **Dropdown Interface**
   - Shows count of selected referrals
   - Click to expand referral management panel

2. **Referral Type Toggle**
   - Switch between "Employee" and "Custom"
   - Blue buttons to indicate selection

3. **Employee Type**
   - Dropdown list of all agents
   - Shows agent name and role
   - Auto-populates name field

4. **Custom Type**
   - Free-text input for custom name
   - No agent_id association

5. **Date Selection**
   - Calendar picker for referral date
   - Defaults to today

6. **Current Referrals List**
   - Shows all referrals with badges (Employee/Custom)
   - Blue badge for employees
   - Green badge for custom
   - Edit date inline
   - Delete button for each referral

7. **Empty State**
   - Helpful message when no referrals
   - Icon and instructions

#### Props

```typescript
interface LeadReferralSelectorProps {
  referrals: LeadReferral[]
  onReferralsChange: (referrals: LeadReferral[]) => void
  agents: Agent[]
  placeholder?: string
}
```

#### Usage in Add/Edit Lead Modals

```tsx
<LeadReferralSelector
  referrals={formData.referrals || []}
  onReferralsChange={(referrals) => setFormData({ ...formData, referrals })}
  agents={agents}
  placeholder="Add lead referrals..."
/>
```

### TypeScript Types

```typescript
// Lead Referral
export interface LeadReferral {
  id: number
  lead_id: number
  agent_id: number | null     // Null for custom referrals
  name: string                 // Agent or custom name
  type: 'employee' | 'custom'
  agent_name?: string          // Populated from join
  referral_date: string
  external: boolean
  created_at?: string
  updated_at?: string
}

// Input for creating/editing referrals
export interface LeadReferralInput {
  id?: number
  name: string
  type: 'employee' | 'custom'
  employee_id?: number
  date: string
}
```

### API Integration (`frontend/src/utils/api.ts`)

```typescript
export const leadsApi = {
  // Get referrals for a lead
  getReferrals: (leadId: number) => 
    apiRequest<LeadReferralsResponse>(`/leads/${leadId}/referrals`),
  
  // Add a referral
  addReferral: (leadId: number, referralData: {
    name: string
    type: 'employee' | 'custom'
    employee_id?: number
    date: string
  }) => apiRequest<...>(`/leads/${leadId}/referrals`, { method: 'POST', body: ... }),
  
  // Delete a referral
  deleteReferral: (leadId: number, referralId: number) =>
    apiRequest<...>(`/leads/${leadId}/referrals/${referralId}`, { method: 'DELETE' })
}
```

## Permissions

### Who Can Manually Add/Delete Referrals?
- **Admin**
- **Operations**
- **Operations Manager**
- **Agent Manager**

### Who Can View Referrals?
- All users with lead viewing permissions

## UI/UX Details

### Visual Design
- Matches Property Referrals UI exactly
- Clean, modern interface
- Responsive design
- Clear visual distinction between employee and custom referrals

### Color Coding
- **Employee referrals**: Blue badges and icons
- **Custom referrals**: Green badges and icons

### User Flow

1. **Adding a Referral**
   - Click on referrals input
   - Click "Add Referral" button
   - Select type (Employee/Custom)
   - Select agent (employee) or enter name (custom)
   - Select date
   - Click "Add Referral"

2. **Editing a Referral Date**
   - Click on the date picker next to the referral
   - Select new date

3. **Deleting a Referral**
   - Click the X button next to the referral
   - Referral is removed immediately

## Testing

### Setup Database
```bash
cd backend
node setup-lead-referrals-db.js
```

### Test Scenarios

1. **Employee Referral**
   - Add lead with employee referral
   - Verify agent_id is populated
   - Verify name is agent name
   - Verify type is 'employee'

2. **Custom Referral**
   - Add lead with custom referral
   - Verify agent_id is null
   - Verify name is custom name
   - Verify type is 'custom'

3. **Mixed Referrals**
   - Add lead with both employee and custom referrals
   - Verify both types work together

4. **Automatic Referral**
   - Assign agent to lead
   - Verify referral is auto-created

5. **1-Month Rule**
   - Create lead with agent A
   - Wait 31 days (or manually update referral_date)
   - Reassign to agent B
   - Verify agent A's referral is marked external=true

6. **Within 1 Month**
   - Create lead with agent A
   - Within 30 days, reassign to agent B
   - Verify agent A's referral remains external=false

## Migration from Old System

If you had the old system without custom referral support:

1. Run the setup script (it will recreate the table):
   ```bash
   cd backend
   node setup-lead-referrals-db.js
   ```

2. Existing referrals will be lost - this is a destructive operation
3. For production, use the migration script instead:
   ```bash
   cd backend
   node run-lead-referrals-migration.js
   ```

The migration script:
- Adds `name` and `type` columns
- Populates `name` from users table for existing records
- Sets `type` to 'employee' for all existing records
- Removes the unique constraint on (lead_id, agent_id)

## Notes

- Custom referrals do NOT create commission records
- Custom referrals are for tracking purposes only
- Employee referrals are tracked for commission calculations
- The external flag applies to both employee and custom referrals
- The 1-month rule only applies to employee referrals

## Future Enhancements

- Export referral reports
- Referral analytics dashboard
- Commission calculation based on referrals
- Referral performance metrics
- Bulk import of referrals


