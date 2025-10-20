# Lead Referrals System - External Commission Logic

## 📋 Overview

This document describes the **Lead Referrals System** implementation, which tracks agent referrals for leads and automatically manages commission eligibility based on re-referral timing.

## 🎯 Purpose

The referral system ensures fair commission tracking when leads are reassigned between agents. It automatically determines whether previous referrers should continue earning commission based on how long they held the lead before reassignment.

## 🧩 Core Logic

### External vs Internal Referrals

- **Internal Referral (external = false)**: The referring agent **earns commission**
- **External Referral (external = true)**: The referring agent **does not earn commission**

### The 1-Month Rule

When a lead is reassigned from Agent A to Agent B:

1. **If reassignment happens WITHIN 1 month**: 
   - Agent A's referral remains **internal** (still earns commission)
   - Agent B gets a new **internal** referral

2. **If reassignment happens AFTER 1 month**:
   - Agent A's referral is marked as **external** (no longer earns commission)
   - Agent B gets a new **internal** referral (earns commission)

### Example Scenarios

#### Scenario 1: Quick Reassignment (Within 1 Month)
```
Day 1:  Lead created → Agent A assigned (Agent A: internal referral)
Day 15: Lead reassigned → Agent B (Agent A: still internal, Agent B: new internal)

Result: Both Agent A and Agent B earn commission
```

#### Scenario 2: Late Reassignment (After 1 Month)
```
Day 1:  Lead created → Agent A assigned (Agent A: internal referral)
Day 45: Lead reassigned → Agent B (Agent A: marked external, Agent B: new internal)

Result: Only Agent B earns commission (Agent A's referral is now external)
```

## 🗄️ Database Schema

### lead_referrals Table

```sql
CREATE TABLE lead_referrals (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  referral_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  external BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE(lead_id, agent_id)
);
```

**Key Fields:**
- `lead_id`: The lead being referred
- `agent_id`: The agent who received the referral
- `referral_date`: When the agent was assigned to this lead
- `external`: Whether this referral is external (no commission)

### Property Referrals Update

The existing `referrals` table (for properties) was also updated to include the `external` field for consistency:

```sql
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS external BOOLEAN DEFAULT FALSE NOT NULL;
```

## 🔧 Backend Implementation

### Models

#### LeadReferralModel.js

Main methods:
- `createReferral(leadId, agentId, referralDate)` - Create a new referral record
- `processLeadReassignment(leadId, newAgentId, previousAgentId)` - Handle the 1-month logic
- `getReferralsByLeadId(leadId)` - Get all referrals for a lead
- `getReferralsByAgentId(agentId)` - Get all referrals made by an agent
- `getReferralStats(agentId)` - Get referral statistics for an agent

#### Key Algorithm: processLeadReassignment()

```javascript
static async processLeadReassignment(leadId, newAgentId, previousAgentId) {
  // 1. Get the most recent internal referral
  const recentReferral = await getRecentInternalReferral(leadId);
  
  if (recentReferral) {
    const daysSince = calculateDays(recentReferral.referral_date, now);
    
    // 2. Check if more than 30 days (1 month)
    if (daysSince > 30) {
      // Mark as external (no commission)
      await markAsExternal(recentReferral.id);
    }
    // else: remains internal (still earns commission)
  }
  
  // 3. Create new referral for the new agent
  await createReferral(leadId, newAgentId, now);
}
```

### Controllers

#### LeadsController Updates

Two main integration points:

**1. createLead() - Track initial referral:**
```javascript
const newLead = await Lead.createLead(leadData);

if (newLead.agent_id) {
  await LeadReferral.createReferral(newLead.id, newLead.agent_id);
}
```

**2. updateLead() - Handle reassignment:**
```javascript
if (req.body.agent_id && req.body.agent_id !== existingLead.agent_id) {
  await LeadReferral.processLeadReassignment(
    leadId,
    req.body.agent_id,
    existingLead.agent_id
  );
}
```

### API Endpoints

#### Lead Referral Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads/:id/referrals` | Get all referrals for a specific lead |
| GET | `/api/leads/agent/:agentId/referral-stats` | Get referral statistics for an agent |

#### Response Examples

**GET /api/leads/123/referrals**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "lead_id": 123,
      "agent_id": 789,
      "agent_name": "John Doe",
      "referral_date": "2025-01-15T10:30:00Z",
      "external": false
    },
    {
      "id": 457,
      "lead_id": 123,
      "agent_id": 790,
      "agent_name": "Jane Smith",
      "referral_date": "2024-12-01T14:20:00Z",
      "external": true
    }
  ]
}
```

**GET /api/leads/agent/789/referral-stats**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_referrals": 15,
      "internal_referrals": 12,
      "external_referrals": 3,
      "first_referral_date": "2024-06-01T10:00:00Z",
      "last_referral_date": "2025-10-19T15:30:00Z"
    },
    "referrals": [
      // Array of referral details
    ]
  }
}
```

## 💻 Frontend Implementation

### Types (leads.ts)

```typescript
export interface LeadReferral {
  id: number
  lead_id: number
  agent_id: number
  agent_name: string
  referral_date: string
  external: boolean
}

export interface Lead {
  // ... existing fields
  referrals?: LeadReferral[]
}
```

### Components

#### LeadReferralsSection Component

Location: `frontend/src/components/LeadReferralsSection.tsx`

Features:
- Displays referral history in chronological order
- Visual indicators for current/external/internal status
- Shows commission eligibility clearly
- Explains why referrals are external
- Summary of commission status

**Visual Indicators:**
- 🔵 **Current** - Most recent assignment (blue badge)
- ✅ **Internal** - Earns commission (green badge)
- ⚠️ **External** - No commission (gray badge)

### Integration

The `LeadReferralsSection` is integrated into:
- **View Lead Modal** - Displays referral history
- **Lead Details Page** - Shows commission tracking

### API Integration (api.ts)

```typescript
export const leadsApi = {
  // Get referrals for a specific lead
  getReferrals: (leadId: number, token?: string) => 
    apiRequest<LeadReferralsResponse>(`/leads/${leadId}/referrals`, {}, token),
  
  // Get referral statistics for an agent
  getAgentReferralStats: (agentId: number, token?: string) => 
    apiRequest<AgentReferralStatsResponse>(`/leads/agent/${agentId}/referral-stats`, {}, token),
}
```

## 📊 Usage Examples

### For Managers/Admins

**View Lead Referral History:**
1. Open any lead in the system
2. Scroll to the "Referral History" section
3. See all agents who have been assigned this lead
4. Check commission status for each referral

**Check Agent Referral Stats:**
```javascript
const stats = await leadsApi.getAgentReferralStats(agentId, token);
console.log(`Agent has ${stats.data.stats.internal_referrals} active commissions`);
```

### For Agents

Agents can view their referral status in the lead details to understand:
- If they will earn commission on a lead
- Why a previous referral might be marked external
- The history of lead assignments

## 🔄 Commission Workflow

```
┌─────────────────────────────────────────────────┐
│  Lead Created → Agent A Assigned                │
│  Status: Agent A has INTERNAL referral          │
└─────────────────────────────────────────────────┘
                      ↓
        ┌─────────────┴─────────────┐
        │                           │
   WITHIN 1 MONTH              AFTER 1 MONTH
        │                           │
        ↓                           ↓
┌───────────────────┐       ┌───────────────────┐
│ Reassign to       │       │ Reassign to       │
│ Agent B           │       │ Agent B           │
├───────────────────┤       ├───────────────────┤
│ Agent A: INTERNAL │       │ Agent A: EXTERNAL │
│ Agent B: INTERNAL │       │ Agent B: INTERNAL │
│                   │       │                   │
│ Both earn         │       │ Only B earns      │
│ commission        │       │ commission        │
└───────────────────┘       └───────────────────┘
```

## 🔐 Permissions

- **Admins, Operations, Operations Managers**: Can view all referrals and statistics
- **Agent Managers**: Can view referrals for their team
- **Agents**: Can view referrals for leads assigned to them
- **Team Leaders**: Can view referrals for their team's leads

## 🚀 Setup Instructions

### Database Migration

1. Run the migration to add the `external` field to property referrals:
```bash
psql -U your_user -d your_database -f backend/database/migrations/add_external_to_referrals.sql
```

2. Create the lead_referrals table:
```bash
psql -U your_user -d your_database -f backend/database/lead_referrals.sql
```

### Backend Deployment

The referral tracking is automatic and requires no configuration. It will:
- Automatically create referrals when leads are assigned
- Automatically apply the 1-month rule when leads are reassigned
- Work seamlessly with existing lead management workflows

### Frontend Deployment

The referral display is integrated into the lead modals and will appear automatically when:
- Viewing lead details
- A lead has referral history

## 🧪 Testing

### Test Cases

**Test Case 1: Initial Assignment**
```
1. Create a new lead
2. Assign to Agent A
3. Verify Agent A has an internal referral
```

**Test Case 2: Quick Reassignment (Within 1 Month)**
```
1. Create lead assigned to Agent A
2. Wait 15 days
3. Reassign to Agent B
4. Verify:
   - Agent A referral is still internal
   - Agent B has a new internal referral
```

**Test Case 3: Late Reassignment (After 1 Month)**
```
1. Create lead assigned to Agent A
2. Wait 31+ days
3. Reassign to Agent B
4. Verify:
   - Agent A referral is marked external
   - Agent B has a new internal referral
```

### Manual Testing

1. **View Referral History:**
   - Create test leads with multiple reassignments
   - Open lead details modal
   - Verify referral history displays correctly
   - Check commission status indicators

2. **Check Stats:**
   - Use the agent referral stats API
   - Verify counts are accurate

## 📈 Performance Considerations

- **Indexes**: The `lead_referrals` table has indexes on `lead_id`, `agent_id`, `referral_date`, and `external` for fast queries
- **Caching**: Referral data is included in lead queries via LEFT JOIN
- **Transaction Safety**: Reassignment logic uses database transactions to ensure data consistency

## 🔮 Future Enhancements

Potential improvements:
1. **Configurable Time Period**: Allow admins to configure the 1-month period
2. **Partial Commissions**: Instead of binary external/internal, support percentage-based commissions
3. **Referral Reports**: Dedicated dashboard for tracking referral performance
4. **Commission Calculations**: Automatic commission calculation based on lead value and referral status
5. **Notifications**: Alert agents when their referrals become external

## 🐛 Troubleshooting

### Issue: Referrals not appearing
**Solution**: Ensure the lead was assigned to an agent (agent_id is not null)

### Issue: Wrong external status
**Solution**: Check the referral_date and verify 30-day calculation is correct

### Issue: Duplicate referrals
**Solution**: The system prevents duplicates via UNIQUE constraint on (lead_id, agent_id)

## 📞 Support

For questions or issues related to the referral system:
1. Check this documentation
2. Review backend logs for referral processing messages (prefixed with 📊)
3. Verify database schema matches the specifications
4. Contact the development team

---

**Last Updated**: October 19, 2025  
**Version**: 1.0.0  
**Author**: Development Team


