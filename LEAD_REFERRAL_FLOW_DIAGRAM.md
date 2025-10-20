# Lead Referral External Logic - Flow Diagrams

## 📊 Visual Guide to External vs Internal Referral Logic

---

## Flow 1: Agent Reassignment (Automatic)

```
┌─────────────────────────────────────────────────────────────┐
│  User Updates Lead - Changes agent_id                      │
│  PUT /api/leads/123 { agent_id: 5 }                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Controller: leadsController.updateLead()                   │
│  Detects agent_id changed from 4 → 5                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Model: LeadReferral.processLeadReassignment()             │
│                                                             │
│  1. Get ALL internal referrals for lead                    │
│  2. Check age of each referral                             │
│  3. Mark referrals >= 30 days old as external              │
│  4. Create new internal referral for agent 5               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Database Updates (in transaction):                        │
│                                                             │
│  UPDATE lead_referrals                                     │
│  SET external = TRUE                                       │
│  WHERE id IN (old_referrals) AND days >= 30                │
│                                                             │
│  INSERT INTO lead_referrals                                │
│  (agent_id, external) VALUES (5, FALSE)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Result: Agent 5 is now internal, old agents external      │
│  Commission eligibility updated automatically              │
└─────────────────────────────────────────────────────────────┘
```

---

## Flow 2: Manual Referrals (Create/Update)

```
┌─────────────────────────────────────────────────────────────┐
│  User Creates/Updates Lead with Multiple Referrals         │
│  POST/PUT /api/leads { referrals: [...] }                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Controller: leadsController.createLead/updateLead()        │
│  Processes referrals array from request                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  For Each Referral:                                         │
│  LeadReferral.createReferral()                             │
│                                                             │
│  - Referral 1: 90 days ago → created                       │
│  - Referral 2: 60 days ago → created                       │
│  - Referral 3: 15 days ago → created                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Model: LeadReferral.applyExternalRuleToLeadReferrals()    │
│                                                             │
│  1. Get ALL referrals for lead (sorted newest → oldest)    │
│  2. Most recent (15 days ago) = baseline                   │
│  3. Compare all others to most recent:                     │
│     - 90 days ago: 75 days older → EXTERNAL                │
│     - 60 days ago: 45 days older → EXTERNAL                │
│     - 15 days ago: most recent → INTERNAL                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Database Updates (in transaction):                        │
│                                                             │
│  UPDATE lead_referrals                                     │
│  SET external = TRUE                                       │
│  WHERE referral_date < (most_recent - 30 days)             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Result: Only most recent + referrals within 30 days       │
│  of most recent are internal                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Timeline Example: Chain Referrals

```
Time →
════════════════════════════════════════════════════════════════

Jan 1         Feb 10             Mar 22
Day 0         Day 40             Day 80
  │             │                  │
  ▼             ▼                  ▼
Alice → Bob   Bob → Carol      Carol → Dave
[internal]    [internal]       [internal]
              [Alice→ext]      [Alice→ext]
                               [Bob→ext]

Legend:
  →      = Referral/Assignment
  [int]  = internal (earns commission)
  [ext]  = external (no commission)
```

### Detailed Breakdown:

```
┌──────────┬────────────────┬──────────────────────────────────┐
│   Date   │  Action        │  Referral Status After          │
├──────────┼────────────────┼──────────────────────────────────┤
│  Jan 1   │ Alice → Bob    │ Alice: internal ✅               │
│  (Day 0) │                │                                  │
├──────────┼────────────────┼──────────────────────────────────┤
│  Feb 10  │ Bob → Carol    │ Alice: external ❌ (40 days old) │
│ (Day 40) │                │ Bob: internal ✅                 │
├──────────┼────────────────┼──────────────────────────────────┤
│  Mar 22  │ Carol → Dave   │ Alice: external ❌ (80 days old) │
│ (Day 80) │                │ Bob: external ❌ (40 days old)   │
│          │                │ Carol: internal ✅               │
└──────────┴────────────────┴──────────────────────────────────┘
```

---

## Decision Tree: Is Referral External?

```
                  ┌─────────────────┐
                  │ Check Referral  │
                  └────────┬────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │ Is this the most      │
               │ recent referral?      │
               └───────┬───────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
           YES                   NO
            │                     │
            ▼                     ▼
    ┌──────────────┐   ┌─────────────────────┐
    │  INTERNAL ✅ │   │ How many days       │
    │              │   │ before most recent? │
    └──────────────┘   └──────┬──────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                < 30 days             >= 30 days
                    │                     │
                    ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │  INTERNAL ✅ │      │  EXTERNAL ❌ │
            └──────────────┘      └──────────────┘
```

---

## Database State Changes

### Before Applying Rule:
```sql
lead_id | agent_id | name   | referral_date | external
--------|----------|--------|---------------|----------
  123   |    1     | Alice  | 2024-12-01    | false
  123   |    2     | Bob    | 2025-01-15    | false
  123   |    3     | Carol  | 2025-02-28    | false
```

### After Applying Rule (Most recent = Feb 28):
```sql
lead_id | agent_id | name   | referral_date | external | reason
--------|----------|--------|---------------|----------|------------------------
  123   |    1     | Alice  | 2024-12-01    | true     | 89 days before Carol
  123   |    2     | Bob    | 2025-01-15    | true     | 44 days before Carol
  123   |    3     | Carol  | 2025-02-28    | false    | Most recent
```

---

## Commission Eligibility Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Query: Who earns commission for Lead 123?                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  SELECT * FROM lead_referrals                               │
│  WHERE lead_id = 123 AND external = FALSE                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Result: Only Carol (external = false)                      │
│                                                             │
│  agent_id: 3                                                │
│  name: Carol                                                │
│  referral_date: 2025-02-28                                  │
│  external: false ✅                                         │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Carol earns commission for Lead 123                        │
│  Alice and Bob do NOT earn commission (external = true)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Edge Case: Multiple Referrals on Same Day

```
Scenario: 3 referrals all created on Jan 1, 2025

┌────────────────────────────────────────────┐
│ All referrals have referral_date = Jan 1  │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│ Days difference = 0 for all               │
│ (0 < 30, so all remain internal)          │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│ Result: ALL are internal ✅               │
│                                            │
│ Alice: internal (0 days difference)        │
│ Bob: internal (0 days difference)          │
│ Carol: internal (0 days difference)        │
└────────────────────────────────────────────┘
```

---

## Edge Case: Exactly 30 Days

```
Scenario: Referral is exactly 30 days before most recent

┌────────────────────────────────────────────┐
│ Referral A: Jan 1                          │
│ Referral B: Jan 31 (exactly 30 days)      │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│ Days difference = 30                       │
│ Condition: >= 30 days                      │
│ Result: TRUE                               │
└───────────────┬────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────┐
│ Referral A: EXTERNAL ❌                   │
│ Referral B: INTERNAL ✅                   │
└────────────────────────────────────────────┘
```

---

## Summary: Key Decision Points

```
╔════════════════════════════════════════════════════════════╗
║              REFERRAL EXTERNAL LOGIC SUMMARY               ║
╚════════════════════════════════════════════════════════════╝

1️⃣  Most Recent Referral
    ├─ Always INTERNAL ✅
    └─ Earns commission

2️⃣  Referrals < 30 Days Before Most Recent
    ├─ Remain INTERNAL ✅
    └─ Continue earning commission

3️⃣  Referrals >= 30 Days Before Most Recent
    ├─ Become EXTERNAL ❌
    └─ Stop earning commission

4️⃣  Automatic Triggers
    ├─ Agent reassignment
    ├─ Manual referral creation
    └─ Manual referral update

5️⃣  Transaction Safety
    ├─ All changes in DB transaction
    └─ Rollback on error

6️⃣  Commission Query
    └─ WHERE external = FALSE
```

---

## Testing Visualization

```
Test Suite Structure:

test-external-referral-logic.js
│
├─ Scenario 1: Single Referral
│  └─ Expected: internal ✅
│
├─ Scenario 2: Re-referral After 1 Month
│  ├─ Day 0: Alice → internal ✅
│  └─ Day 40: Bob → internal ✅, Alice → external ❌
│
├─ Scenario 3: Re-referral Within 1 Month
│  ├─ Day 0: Alice → internal ✅
│  └─ Day 20: Bob → internal ✅, Alice → internal ✅
│
├─ Scenario 4: Chain Case
│  ├─ Day 0: Alice → internal ✅
│  ├─ Day 40: Bob → internal ✅, Alice → external ❌
│  └─ Day 80: Carol → internal ✅, Bob & Alice → external ❌
│
└─ Scenario 5: Mixed Manual Referrals
   ├─ 90 days ago: Alice → external ❌
   ├─ 60 days ago: Bob → external ❌
   ├─ 45 days ago: External Partner → external ❌
   └─ 15 days ago: Carol → internal ✅
```

---

**Visual Guide Complete** ✅

For code details, see:
- `LEAD_REFERRAL_EXTERNAL_LOGIC.md` - Comprehensive documentation
- `LEAD_REFERRAL_EXTERNAL_IMPLEMENTATION_SUMMARY.md` - Quick reference
- `backend/models/leadReferralModel.js` - Implementation
- `backend/test-external-referral-logic.js` - Test suite

