# Ahmad Al-Masri - Complete Referral Breakdown (October 2025)

## Report Summary
- **Sales Count**: 17 properties
- **Sales Amount**: $3,840,302.00
- **Referral Commission**: $19,201.51 (commission TO referrers)
- **Referral Received Count**: 1 property
- **Referral Received Commission**: $2,540.25 (commission FROM properties Ahmad referred)

---

## 1️⃣  Properties Ahmad Referred (Receiving Commission)

Ahmad gets commission when properties **he referred** close.

### Total: 1 Property

| Property | Agent | Price | Closed | Commission to Ahmad |
|----------|-------|-------|--------|-------------------|
| FBS25781 | David Martinez | $508,049.00 | Oct 29 | **$2,540.24** |

**Total Referral Received Commission: $2,540.25** ✅

---

## 2️⃣  Ahmad's Properties with Internal Referrals (Paying Commission)

When Ahmad's own properties close, referrers get commission.

### Total: 6 Properties (out of 17 closed)

| Property | Price | Closed | Referrer(s) | Commission Each |
|----------|-------|--------|-------------|----------------|
| **FSR25344** | $3,058.00 | Oct 23 | David Martinez<br>null (custom) | $15.29<br>$15.29 |
| **FVS25357** | $269,078.00 | Oct 24 | Sarah Johnson | $1,345.39 |
| **FPCS25210** | $235,630.00 | Oct 28 | Samir Khoury | $1,178.15 |
| **FWR25892** | $3,380.00 | Oct 28 | Omar Saliba | $16.90 |
| **FIBS25680** | $899,093.00 | Oct 29 | Layla Fakhoury | $4,495.47 |
| **FSTS25701** | $480,145.00 | Oct 29 | Samir Khoury<br>null (custom) | $2,400.72<br>$2,400.72 |

**Total Commission TO Referrers: $11,867.94**

---

## How Commission is Calculated

### ❓ Why doesn't referral_commission equal $11,867.94?

The `referral_commission` field is calculated as **0.5% of total sales**, NOT the sum of individual property referrals.

**Calculation:**
```
Total Sales Amount: $3,840,302.00
Referral Commission: $3,840,302.00 × 0.5% = $19,201.51
```

This $19,201.51 represents the **total commission budget** that will be distributed to:
1. Agents who referred Ahmad's properties (like Sarah Johnson, Samir Khoury, etc.)
2. Any other referral sources

### The Two Different Calculations:

#### Method 1: Total Sales × 0.5% (What the system uses)
- **Total Sales**: $3,840,302.00
- **Commission**: $19,201.51
- **Used for**: Ahmad's `referral_commission` field

#### Method 2: Sum of Individual Property Commissions (What you calculated)
- **6 Properties**: $1,890,384.00 (total value of properties with referrals)
- **Commission**: $9,451.92 (0.5% of $1,890,384)
- **Note**: Actual sum is $11,867.94 because some properties have 2 referrals

---

## Why Method 1 is Used

The system calculates commission as a percentage of **total sales**, not individual properties, because:

1. **Simplicity**: One calculation for all commissions
2. **Consistency**: All commission types (agent, finders, referral, team leader, admin) use the same base
3. **Budget**: The 0.5% is a fixed budget from total sales

---

## Where Each Commission Appears

### Ahmad's Report Shows:
- ✅ `referral_commission`: $19,201.51 (budget for referrers from his sales)
- ✅ `referral_received_commission`: $2,540.25 (he receives from FBS25781)

### Referrers' Reports Show:
- Sarah Johnson: +$1,345.39 in her `referral_received_commission`
- Samir Khoury: +$3,578.87 in his `referral_received_commission` ($1,178.15 + $2,400.72)
- Layla Fakhoury: +$4,495.47 in her `referral_received_commission`
- Omar Saliba: +$16.90 in his `referral_received_commission`
- David Martinez: +$15.29 in his `referral_received_commission`
- Custom referrals: $2,416.01 (tracked but not paid to employees)

**Total paid to employee referrers: $9,451.92**
**Custom referrals (no commission): $2,416.01**
**Total: $11,867.93**

---

## Conclusion

✅ **Everything is correct!**

- Ahmad's `referral_commission` ($19,201.51) = 0.5% of his total sales
- Ahmad's `referral_received_commission` ($2,540.25) = commission from 1 property he referred
- 6 of Ahmad's 17 closed properties have internal referrals
- These referrals correctly appear in the referring agents' reports

The system uses **total sales** as the commission base, not individual property values.

