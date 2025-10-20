# Lead Referral System Bug Fixes

## Problems Identified
1. **Adding referrals to leads was not working** - Despite showing success messages, referrals were not being saved to the database
2. **Referrals not appearing in view/edit modals** - Existing referrals were not being displayed when viewing or editing leads

## Root Causes

### Problem 1: Function Signature Mismatch
**Location:** `frontend/src/components/LeadsModals.tsx`

The `handleAddReferral` function was calling the API incorrectly:

### Before (Incorrect):
```typescript
const response = await leadsApi.addReferral(leadId, agentId, referralDate, token)
```

This was passing:
1. `leadId` (number) ✅
2. `agentId` (number) ❌ - Should be an object
3. `referralDate` (string) ❌ - Treated as the token parameter
4. `token` (string) ❌ - Ignored (4th parameter doesn't exist)

### Expected API Signature:
```typescript
addReferral(
  leadId: number,
  referralData: {
    name: string,
    type: 'employee' | 'custom',
    employee_id?: number,
    date: string
  },
  token?: string
)
```

## Solution
Fixed the function call to pass the correct referral data object structure:

### After (Correct):
```typescript
// Get the agent name from the agents list
const agent = agents.find(a => a.id === agentId)
const agentName = agent?.name || 'Unknown Agent'

// Create the referral data object with the correct structure
const referralData = {
  name: agentName,
  type: 'employee' as const,
  employee_id: agentId,
  date: referralDate
}

console.log('📤 Sending referral data:', referralData)
const response = await leadsApi.addReferral(leadId, referralData, token)
console.log('📥 Received response:', response)
```

## Changes Made
- **File**: `frontend/src/components/LeadsModals.tsx`
- **Function**: `handleAddReferral` (lines 152-189)
- **Changes**:
  1. Look up the agent name from the agents array
  2. Create a proper `referralData` object with all required fields
  3. Pass the object as the second parameter to `leadsApi.addReferral`
  4. Added console logs for debugging

## Backend Endpoint (Reference)
The backend endpoint `/api/leads/:id/referrals` (POST) expects:
```javascript
{
  name: string,           // Agent name or custom referrer name
  type: 'employee' | 'custom',
  employee_id: number,    // Required for employee type
  date: string            // Referral date
}
```

## Testing
To verify the fix:
1. Open the leads management page
2. View or edit a lead
3. Click "Add Referral" in the referrals section
4. Select an agent and date
5. Click "Add"
6. The referral should now be saved and visible in the list
7. Check browser console for the debug logs showing the correct data being sent

## Related Files
- `frontend/src/components/LeadsModals.tsx` - Fixed
- `frontend/src/components/LeadReferralsSection.tsx` - Calls handleAddReferral
- `frontend/src/utils/api.ts` - API definition (line 548)
- `backend/controllers/leadsController.js` - Backend handler (line 809-876)
- `backend/routes/leadsRoutes.js` - Route definition (line 63)
- `backend/models/leadReferralModel.js` - Database model

### Problem 2: Missing Referrals in Modals
**Location:** `frontend/src/app/dashboard/leads/page.tsx`

The `handleViewLead` and `handleEditLead` functions were using lead objects from the list, which don't include referrals. Only the `getLeadById` query fetches referrals, but the list queries (`getAllLeads`, `getLeadsWithFilters`) don't include them for performance reasons.

**Before (Incorrect):**
```typescript
const handleViewLead = (lead: Lead) => {
  setSelectedLead(lead)  // Using lead from list (no referrals)
  setShowViewModal(true)
}

const handleEditLead = (lead: Lead) => {
  setSelectedLead(lead)  // Using lead from list (no referrals)
  // ... prepare form data ...
  setShowEditModal(true)
}
```

**After (Correct):**
```typescript
const handleViewLead = async (lead: Lead) => {
  // Fetch full lead data including referrals before opening modal
  await handleRefreshLead(lead.id)
  setShowViewModal(true)
}

const handleEditLead = async (lead: Lead) => {
  // Fetch full lead data including referrals before opening modal
  const refreshedLead = await handleRefreshLead(lead.id)
  
  if (!refreshedLead) return
  
  // Use refreshedLead (with referrals) to prepare form data
  const convertedReferrals = (refreshedLead.referrals || []).map(...)
  // ... prepare form data with referrals ...
  setShowEditModal(true)
}
```

Also updated `handleRefreshLead` to return the refreshed lead data:
```typescript
const handleRefreshLead = async (leadId: number): Promise<Lead | null> => {
  // ... fetch and update logic ...
  return refreshedLead
}
```

## Changes Made

### File 1: `frontend/src/components/LeadsModals.tsx`
- **Function**: `handleAddReferral` (lines 152-189)
- **Changes**:
  1. Look up the agent name from the agents array
  2. Create a proper `referralData` object with all required fields
  3. Pass the object as the second parameter to `leadsApi.addReferral`
  4. Added console logs for debugging

### File 2: `frontend/src/app/dashboard/leads/page.tsx`
- **Function**: `handleRefreshLead` (lines 541-587)
  - Modified to return `Promise<Lead | null>` instead of `Promise<void>`
  - Now returns the refreshed lead data for immediate use
  
- **Function**: `handleViewLead` (lines 301-306)
  - Made async
  - Calls `handleRefreshLead` to fetch full lead data before opening modal
  
- **Function**: `handleEditLead` (lines 308-356)
  - Made async
  - Calls `handleRefreshLead` and uses the returned data directly
  - Uses `refreshedLead` (with referrals) instead of the list lead object

## Status
✅ **Both Issues Fixed**
- Referrals are now correctly saved to the database when added
- Referrals are now displayed in view and edit modals

