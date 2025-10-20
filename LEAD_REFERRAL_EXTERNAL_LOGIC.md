# Lead Referral External vs Internal Logic

## Overview

This document describes the implementation of the **30-day external referral rule** for lead referrals in the Finders CRM system.

## Core Rule

A referral becomes **external** (`external = true`) when the lead it originally referred gets re-referred to a new agent **after more than 30 days** from the date of the original referral.

- **Internal Referral** (`external = false`): Referrer continues to earn commission
- **External Referral** (`external = true`): Referrer no longer earns commission

---

## Implementation Details

### Database Schema

The `lead_referrals` table includes:

```sql
CREATE TABLE lead_referrals (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  agent_id INTEGER,  -- Nullable for custom referrals
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'employee',
  referral_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  external BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Key Methods

#### 1. `processLeadReassignment(leadId, newAgentId, previousAgentId)`

**Location:** `backend/models/leadReferralModel.js`

**Purpose:** Automatically handles referral logic when a lead is reassigned to a new agent.

**Behavior:**
- Gets ALL internal (non-external) referrals for the lead
- Checks each referral's age against the current date
- Marks ALL referrals older than 30 days as external
- Creates a new internal referral for the newly assigned agent

**Example:**
```javascript
const result = await LeadReferral.processLeadReassignment(
  leadId: 123,
  newAgentId: 456,
  previousAgentId: 789
);

// Returns:
{
  newReferral: { id: 10, lead_id: 123, agent_id: 456, external: false, ... },
  markedExternalReferrals: [
    { id: 8, lead_id: 123, agent_id: 789, external: true, ... },
    { id: 7, lead_id: 123, agent_id: 555, external: true, ... }
  ],
  message: 'Marked 2 referral(s) as external (over 1 month old)'
}
```

#### 2. `applyExternalRuleToLeadReferrals(leadId)`

**Location:** `backend/models/leadReferralModel.js`

**Purpose:** Applies the 30-day rule to all referrals for a specific lead.

**Behavior:**
- Gets ALL referrals for the lead, ordered by date (newest first)
- The most recent referral always remains internal
- Marks any referral that is 30+ days older than the most recent one as external
- Can also mark referrals back as internal if dates are adjusted

**Use Cases:**
- After manual referral creation/update
- Bulk processing of referrals
- Correcting referral statuses

**Example:**
```javascript
const result = await LeadReferral.applyExternalRuleToLeadReferrals(leadId: 123);

// Returns:
{
  markedExternalReferrals: [
    { id: 8, lead_id: 123, agent_id: 789, external: true, ... }
  ],
  message: 'Marked 1 referral(s) as external (>= 30 days old)'
}
```

---

## Scenarios

### ✅ Scenario 1: New Referral (Initial)

**When:** Lead is referred for the first time

**Action:**
```javascript
await LeadReferral.createReferral(leadId, agentId, agentName, 'employee', new Date());
```

**Result:**
- New referral created with `external = false`
- Referrer earns commission

---

### 🔁 Scenario 2: Lead Re-Referred After 1 Month

**Timeline:**
- **Day 0:** Lead assigned to Agent A
- **Day 40:** Lead reassigned to Agent B

**Action:**
```javascript
await LeadReferral.processLeadReassignment(leadId, agentB_id, agentA_id);
```

**Result:**
- Agent A's referral → `external = true` (no longer earns commission)
- Agent B's referral → `external = false` (now earns commission)

---

### ⚙️ Scenario 3: Lead Re-Referred Within 1 Month

**Timeline:**
- **Day 0:** Lead assigned to Agent A
- **Day 20:** Lead reassigned to Agent B

**Action:**
```javascript
await LeadReferral.processLeadReassignment(leadId, agentB_id, agentA_id);
```

**Result:**
- Agent A's referral → `external = false` (still earns commission)
- Agent B's referral → `external = false` (also earns commission)

---

### ⚖️ Scenario 4: Multiple Re-Referrals (Chain Case)

**Timeline:**
- **Jan 1 (Day 0):** Alice → Bob
- **Feb 10 (Day 40):** Bob → Carol
- **Mar 22 (Day 80):** Carol → Dave

**After each assignment:**

| Date | Assignment | Action | Alice | Bob | Carol | Dave |
|------|-----------|--------|-------|-----|-------|------|
| Jan 1 | A→B | Initial | internal | - | - | - |
| Feb 10 | B→C | +40 days | **external** | internal | - | - |
| Mar 22 | C→D | +40 days | external | **external** | internal | - |

**Implementation:**
```javascript
// Jan 1
await LeadReferral.createReferral(leadId, aliceId, 'Alice', 'employee', new Date('2025-01-01'));

// Feb 10
await LeadReferral.processLeadReassignment(leadId, carolId, bobId);
// Alice's referral marked external (40 days old)

// Mar 22
await LeadReferral.processLeadReassignment(leadId, daveId, carolId);
// Bob's referral marked external (40 days old)
// Alice remains external
// Carol is now internal
```

---

## Automatic Integration Points

### 1. Agent Assignment via Lead Update

**Location:** `backend/controllers/leadsController.js` → `updateLead()`

**Trigger:** When `agent_id` changes on a lead

```javascript
if (req.body.agent_id && req.body.agent_id !== existingLead.agent_id) {
  await LeadReferral.processLeadReassignment(
    parseInt(id),
    req.body.agent_id,
    existingLead.agent_id
  );
}
```

### 2. Manual Referral Creation/Update

**Location:** `backend/controllers/leadsController.js` → `createLead()` and `updateLead()`

**Trigger:** When referrals are provided in the request body

```javascript
if (req.body.referrals && Array.isArray(req.body.referrals)) {
  // Create all referrals
  for (const referral of req.body.referrals) {
    await LeadReferral.createReferral(...);
  }
  
  // Apply 30-day rule to all referrals
  await LeadReferral.applyExternalRuleToLeadReferrals(leadId);
}
```

---

## API Response Examples

### Creating a Lead with Multiple Referrals

**Request:**
```json
POST /api/leads
{
  "customer_name": "John Doe",
  "phone_number": "+1234567890",
  "agent_id": 5,
  "referrals": [
    {
      "type": "employee",
      "employee_id": 10,
      "name": "Alice Smith",
      "date": "2024-12-01"
    },
    {
      "type": "employee",
      "employee_id": 12,
      "name": "Bob Jones",
      "date": "2025-01-15"
    }
  ]
}
```

**Backend Processing:**
1. Create lead
2. Create referral for Alice (Dec 1)
3. Create referral for Bob (Jan 15)
4. Apply 30-day rule:
   - Alice's referral → `external = true` (45 days older than Bob)
   - Bob's referral → `external = false` (most recent)

---

## Console Logs

The implementation includes comprehensive logging for debugging:

```
📊 Lead 123 - Found 2 internal referral(s)
   Referral 8 - 45.23 days old
   ⚠️ Marking referral 8 as external (>= 30 days)
   Referral 9 - 15.67 days old
   ✅ Referral 9 remains internal (< 30 days)
✅ Lead 123 - Referral processing complete
```

---

## Testing Recommendations

### Test Case 1: Single Referral
- Create lead with referral
- Verify `external = false`

### Test Case 2: Re-referral Within 30 Days
- Create lead with Agent A
- After 15 days, reassign to Agent B
- Verify both have `external = false`

### Test Case 3: Re-referral After 30 Days
- Create lead with Agent A
- After 35 days, reassign to Agent B
- Verify Agent A has `external = true`, Agent B has `external = false`

### Test Case 4: Multiple Chain Referrals
- Create lead with 3 referrals at different dates
- Verify oldest ones are marked external

### Test Case 5: Manual Referral Update
- Create lead with multiple referrals
- Update referral dates
- Verify external status recalculates correctly

---

## Key Changes Summary

### Modified Files

1. **`backend/models/leadReferralModel.js`**
   - Updated `processLeadReassignment()` to mark ALL referrals >30 days as external (not just most recent)
   - Added `applyExternalRuleToLeadReferrals()` method for manual referral processing

2. **`backend/controllers/leadsController.js`**
   - Integrated external rule application in `createLead()`
   - Integrated external rule application in `updateLead()`

### Database Changes

No schema changes required. The `external` boolean field was already added to `lead_referrals` table.

---

## Commission Eligibility

To determine if an agent earns commission:

```sql
-- Get all active (internal) referrals for a lead
SELECT * FROM lead_referrals 
WHERE lead_id = $1 AND external = FALSE
ORDER BY referral_date DESC;
```

**Rule:**
- If `external = false` → Agent earns commission
- If `external = true` → Agent does NOT earn commission

---

## Future Enhancements

1. **Configurable Time Period**
   - Make the 30-day threshold configurable via settings
   - Allow different thresholds for different agent types

2. **Notification System**
   - Notify agents when their referral becomes external
   - Alert admins of referral status changes

3. **Reporting Dashboard**
   - Show internal vs external referral statistics
   - Track commission eligibility over time

4. **Automatic Periodic Updates**
   - Scheduled job to periodically apply the rule to all leads
   - Ensures consistency even if manual updates are missed

---

## Conclusion

The 30-day external referral rule is now fully implemented and automatically applied when:
- Leads are reassigned to new agents
- Manual referrals are created or updated
- Multiple referrals exist for a single lead

The system ensures fair commission distribution by marking older referrals as external after the 30-day threshold, while maintaining accurate records of all referral history.

