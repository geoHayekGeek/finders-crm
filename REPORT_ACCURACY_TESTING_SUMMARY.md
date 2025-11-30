# Report Accuracy Testing Summary

This document summarizes the testing strategy and tools created to verify report accuracy in the CRM system.

## Overview

Reports calculate various metrics including listings, leads, viewings, sales, and commissions. Ensuring accuracy is critical for financial calculations and business decisions.

## Testing Approach

### 1. **Unit Tests** (Already Implemented)
- **Location**: `backend/__tests__/models/reportsModel.test.js`
- **Purpose**: Test calculation logic with mocked database queries
- **Coverage**: Basic calculations, edge cases, error handling
- **Run**: `npm test -- reportsModel.test.js`

### 2. **Integration Tests** (New)
- **Location**: `backend/__tests__/models/reportsModel.integration.test.js`
- **Purpose**: Test accuracy against real database with test data
- **Coverage**:
  - Listings count accuracy
  - Sales count and amount accuracy
  - Commission calculation accuracy
  - Referral commission accuracy (internal vs external)
  - Date range filtering
  - Edge cases (zero sales, missing data)
- **Run**: `npm test -- reportsModel.integration.test.js`

### 3. **Manual Verification Script** (New)
- **Location**: `backend/scripts/verify-report-accuracy.js`
- **Purpose**: Compare report values with direct SQL queries
- **Usage**:
  ```bash
  # Verify a specific report
  node backend/scripts/verify-report-accuracy.js <reportId>
  
  # Verify all reports for an agent
  node backend/scripts/verify-report-accuracy.js --agent <agentId>
  ```
- **Output**: Detailed comparison showing any mismatches

### 4. **Testing Guide** (New)
- **Location**: `backend/__tests__/REPORT_ACCURACY_TESTING_GUIDE.md`
- **Purpose**: Comprehensive guide on what to test and how
- **Contents**:
  - Testing strategy overview
  - Key areas to test (data aggregation, commissions, referrals, dates)
  - SQL queries for manual verification
  - Edge cases and common issues
  - Manual verification checklist

## What Gets Tested

### Data Aggregation
- ✅ Listings count (properties created in date range)
- ✅ Lead sources (counts by source)
- ✅ Viewings count
- ✅ Sales count and total amount

### Commission Calculations
- ✅ Agent commission (percentage of sales amount)
- ✅ Finders commission
- ✅ Referral commission (on sales)
- ✅ Team leader commission
- ✅ Administration commission
- ✅ Total commission (sum of all commissions)

### Referral Commissions
- ✅ Property referrals received (internal vs external rates)
- ✅ Lead referrals received (internal vs external rates)
- ✅ Referrals on properties (commissions paid out)

### Date Range Filtering
- ✅ Boundary conditions (start and end dates inclusive)
- ✅ Time zone handling
- ✅ Properties outside range excluded

### Edge Cases
- ✅ Missing commission settings (defaults used)
- ✅ Zero sales (all commissions zero)
- ✅ No referrals (referral commissions zero)
- ✅ Decimal precision (rounding to 2 decimal places)

## How to Use

### Running Integration Tests

1. **Setup test database** (if using separate test DB):
   ```bash
   # Set up test database with schema
   psql -d test_db -f backend/database/schema.sql
   ```

2. **Run tests**:
   ```bash
   npm test -- reportsModel.integration.test.js
   ```

### Manual Verification

1. **Verify a specific report**:
   ```bash
   node backend/scripts/verify-report-accuracy.js 123
   ```

2. **Verify all reports for an agent**:
   ```bash
   node backend/scripts/verify-report-accuracy.js --agent 5
   ```

3. **Review output**:
   - ✅ Green checkmarks indicate matches
   - ❌ Red X marks indicate mismatches
   - Summary shows total issues found

### Manual Checklist

When reviewing reports manually, verify:

- [ ] Listings count matches property count in date range
- [ ] Lead sources match actual lead counts by source
- [ ] Viewings count matches actual viewings
- [ ] Sales count matches closed properties
- [ ] Sales amount matches sum of closed property prices
- [ ] Each commission = sales_amount × (rate / 100)
- [ ] Total commission = sum of all individual commissions
- [ ] Referral commissions match SQL queries
- [ ] Date boundaries are inclusive
- [ ] All values rounded to 2 decimal places

## SQL Queries for Manual Verification

### Listings Count
```sql
SELECT COUNT(*) 
FROM properties 
WHERE agent_id = $1 
AND created_at >= $2::timestamp 
AND created_at <= $3::timestamp;
```

### Sales Count and Amount
```sql
SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total_amount
FROM properties 
WHERE agent_id = $1 
AND closed_date >= $2::date 
AND closed_date <= $3::date
AND status_id IN (
  SELECT id FROM statuses 
  WHERE LOWER(code) IN ('sold', 'rented', 'closed')
);
```

### Referral Commission (Property Referrals)
```sql
SELECT 
  COUNT(DISTINCT p.id) as count,
  COALESCE(SUM(
    CASE 
      WHEN (r.external = TRUE) THEN p.price * $external_rate / 100
      ELSE p.price * $internal_rate / 100
    END
  ), 0) as total_commission
FROM properties p
INNER JOIN referrals r ON p.id = r.property_id
WHERE r.employee_id = $agent_id 
AND p.closed_date >= $start_date 
AND p.closed_date <= $end_date
AND p.status_id IN (
  SELECT id FROM statuses 
  WHERE LOWER(code) IN ('sold', 'rented', 'closed')
);
```

## Common Issues to Watch For

1. **Date Boundary Errors**: Off-by-one errors in date comparisons
2. **Time Zone Issues**: UTC vs local time conversions
3. **Precision Errors**: Floating-point arithmetic issues
4. **NULL Handling**: Missing data in aggregations
5. **Commission Rate Changes**: Settings changed after report creation
6. **Referral External Flag**: Incorrect application of internal/external rates

## Best Practices

1. **Run verification after report generation**: Use the verification script to catch issues early
2. **Test with known data**: Create test reports with known values to verify calculations
3. **Check edge cases**: Test with zero sales, no referrals, missing settings
4. **Verify date ranges**: Ensure boundary dates are handled correctly
5. **Monitor commission totals**: Ensure total commission equals sum of parts
6. **Regular audits**: Periodically verify reports against SQL queries

## Next Steps

1. **Add to CI/CD**: Include integration tests in continuous integration pipeline
2. **Automated alerts**: Set up alerts when verification fails
3. **Performance testing**: Test with large datasets
4. **Historical verification**: Verify existing reports in production
5. **Documentation**: Keep testing guide updated as features change

## Files Created

1. `backend/__tests__/REPORT_ACCURACY_TESTING_GUIDE.md` - Comprehensive testing guide
2. `backend/__tests__/models/reportsModel.integration.test.js` - Integration tests
3. `backend/scripts/verify-report-accuracy.js` - Manual verification script
4. `REPORT_ACCURACY_TESTING_SUMMARY.md` - This summary document

## Support

For questions or issues with report accuracy testing:
1. Review the testing guide: `backend/__tests__/REPORT_ACCURACY_TESTING_GUIDE.md`
2. Run the verification script to identify specific issues
3. Check the integration tests for examples of correct behavior
4. Review the reportsModel.js source code for calculation logic





