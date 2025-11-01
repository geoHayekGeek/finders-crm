# Property Referral Investigation - FVS25357

## Issue Reported
Property FVS25357 has referrals but they're not being counted in the report.

## Investigation Results

### Property Details
- **Reference Number**: FVS25357
- **Agent**: Ahmad Al-Masri (ID: 34)
- **Price**: $269,078.00
- **Status**: Closed
- **Closed Date**: October 25, 2025

### Referrals Found
1. **Michael Chen** (ID: 44)
   - Type: Employee
   - Date: September 1, 2025
   - **External**: `true` ❌
   - **Result**: Will NOT count (marked as external)

2. **Sarah Johnson** (ID: 41)
   - Type: Employee
   - Date: October 31, 2025
   - **External**: `false` ✅
   - **Result**: SHOULD count (internal referral)

## Root Cause

The property itself was correctly configured:
- ✅ Has a valid referral (Sarah Johnson)
- ✅ Referral is internal (external = false)
- ✅ Property is closed with closed_date set
- ✅ Property meets all query conditions

**HOWEVER:**
- ❌ **No report existed for Sarah Johnson for October 2025**
- ❌ Without a report, the referral commission cannot be calculated/displayed

## Solution Applied

Created a report for Sarah Johnson for October 2025:
- **Referral Received Count**: 1 ✅
- **Referral Received Commission**: $1,345.39 ✅
  - Calculated as: $269,078.00 × 0.5% = $1,345.39

## Important Notes

### Commission Types Explained

There are **two different** commission fields related to referrals:

1. **`referral_commission`** (in Property Owner's Report)
   - This is commission that goes **TO** the referrers
   - Shows in **Ahmad's report** (the property owner)
   - Calculated from Ahmad's sales amount
   - Example: Ahmad's $3.84M sales → $19,201.51 goes to referrers

2. **`referral_received_commission`** (in Referring Agent's Report)
   - This is commission that the referrer **RECEIVES**
   - Shows in **Sarah Johnson's report** (the referring agent)
   - Calculated from properties Sarah referred that closed
   - Example: Sarah referred FVS25357 → receives $1,345.39

### Why Referrals Don't Show in Property Owner's Report

The referral commission for property FVS25357 shows in **Sarah Johnson's report** (the referrer), NOT in Ahmad's report (the property owner).

Ahmad's report shows:
- His own sales and commissions
- Total referral commission (commission TO referrers of his properties)

Sarah's report shows:
- Her own sales and commissions
- Referral received commission (commission FROM properties she referred) ✅

## Verification

The calculation query correctly finds the property:
```sql
SELECT COUNT(DISTINCT p.id), SUM(p.price)
FROM properties p
INNER JOIN referrals r ON p.id = r.property_id
WHERE r.employee_id = 41  -- Sarah Johnson
AND r.external = FALSE
AND p.closed_date >= '2025-10-01'
AND p.closed_date <= '2025-10-31'
AND p.status_id IN (SELECT id FROM statuses WHERE code IN ('sold', 'rented', 'closed'))
```

**Result**: ✅ Property FVS25357 is correctly included

## Conclusion

✅ **Issue Resolved**: Report created for Sarah Johnson, property FVS25357 is now included
✅ **Commission**: $1,345.39 correctly calculated
✅ **Data Integrity**: All property and referral data is correct

The issue was simply that **no report existed** for the referring agent. Once created/recalculated, the referral commission appears correctly.

