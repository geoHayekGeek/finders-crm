# Report Accuracy Testing Guide

This guide outlines strategies and tests to verify that reports are accurate and calculations are correct.

## Testing Strategy

### 1. **Unit Tests (Already Implemented)**
- Mock database queries
- Test calculation logic with known inputs/outputs
- Test edge cases (missing data, invalid dates, etc.)

### 2. **Integration Tests (Recommended)**
- Use real database with test data
- Verify calculations match actual database records
- Test end-to-end report generation

### 3. **Manual Verification Tests**
- Compare report values against raw SQL queries
- Spot-check calculations manually
- Verify date filtering works correctly

## Key Areas to Test

### A. Data Aggregation Accuracy

#### 1. Listings Count
- **Test**: Verify `listings_count` matches actual properties created by agent in date range
- **SQL Verification**:
```sql
SELECT COUNT(*) 
FROM properties 
WHERE agent_id = $1 
AND created_at >= $2::timestamp 
AND created_at <= $3::timestamp;
```

#### 2. Lead Sources
- **Test**: Verify lead source counts match actual leads grouped by source
- **SQL Verification**:
```sql
SELECT rs.source_name, COUNT(*) as count
FROM leads l
LEFT JOIN reference_sources rs ON l.reference_source_id = rs.id
WHERE l.agent_id = $1 
AND DATE(l.date) >= $2::date 
AND DATE(l.date) <= $3::date
GROUP BY rs.source_name;
```

#### 3. Viewings Count
- **Test**: Verify `viewings_count` matches actual viewings in date range
- **SQL Verification**:
```sql
SELECT COUNT(*) 
FROM viewings 
WHERE agent_id = $1 
AND viewing_date >= $2::date 
AND viewing_date <= $3::date;
```

#### 4. Sales Count and Amount
- **Test**: Verify sales count and total amount match closed properties
- **SQL Verification**:
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

### B. Commission Calculations

#### 1. Agent Commission
- **Formula**: `sales_amount * (commission_agent_percentage / 100)`
- **Test**: Verify calculation matches expected percentage
- **Example**: If sales_amount = $500,000 and rate = 2%, commission = $10,000

#### 2. Finders Commission
- **Formula**: `sales_amount * (commission_finders_percentage / 100)`
- **Test**: Verify calculation matches expected percentage

#### 3. Referral Commission (on Sales)
- **Formula**: `sales_amount * (commission_referral_internal_percentage / 100)`
- **Test**: Verify calculation matches expected percentage
- **Note**: This is different from referral_received_commission

#### 4. Team Leader Commission
- **Formula**: `sales_amount * (commission_team_leader_percentage / 100)`
- **Test**: Verify calculation matches expected percentage

#### 5. Administration Commission
- **Formula**: `sales_amount * (commission_administration_percentage / 100)`
- **Test**: Verify calculation matches expected percentage

#### 6. Total Commission
- **Formula**: Sum of all individual commissions
- **Test**: Verify `total_commission = agent_commission + finders_commission + referral_commission + team_leader_commission + administration_commission + referrals_on_properties_commission`
- **Precision**: Should be rounded to 2 decimal places

### C. Referral Commission Logic

#### 1. Property Referrals (Received)
- **Internal Rate**: Used when `external = FALSE` or `NULL`
- **External Rate**: Used when `external = TRUE`
- **Test**: Verify correct rate is applied based on external flag
- **SQL Verification**:
```sql
SELECT 
  COUNT(DISTINCT p.id) as count,
  COALESCE(SUM(
    CASE 
      WHEN (r.external = TRUE) THEN p.price * $external_rate / 100
      ELSE p.price * $internal_rate / 100
    END
  ), 0) as total_commission,
  COALESCE(SUM(p.price), 0) as total_amount
FROM properties p
INNER JOIN referrals r ON p.id = r.property_id
WHERE r.employee_id = $agent_id 
AND p.closed_date >= $start_date 
AND p.closed_date <= $end_date
AND p.status_id IN (SELECT id FROM statuses WHERE LOWER(code) IN ('sold', 'rented', 'closed'));
```

#### 2. Lead Referrals (Received)
- **Similar logic to property referrals**
- **Test**: Verify lead referral commissions are calculated correctly
- **SQL Verification**:
```sql
SELECT 
  COUNT(DISTINCT p.id) as count,
  COALESCE(SUM(
    CASE 
      WHEN (lr.external = TRUE) THEN p.price * $external_rate / 100
      ELSE p.price * $internal_rate / 100
    END
  ), 0) as total_commission,
  COALESCE(SUM(p.price), 0) as total_amount
FROM properties p
INNER JOIN leads l ON p.owner_id = l.id
INNER JOIN lead_referrals lr ON l.id = lr.lead_id
WHERE lr.agent_id = $agent_id 
AND p.closed_date >= $start_date 
AND p.closed_date <= $end_date
AND p.status_id IN (SELECT id FROM statuses WHERE LOWER(code) IN ('sold', 'rented', 'closed'));
```

#### 3. Referrals on Properties (Paid Out)
- **Test**: Verify commissions paid to referrers of agent's properties
- **SQL Verification**:
```sql
SELECT 
  COUNT(r.id) as count,
  COALESCE(SUM(
    CASE 
      WHEN (r.external = TRUE) THEN p.price * $external_rate / 100
      ELSE p.price * $internal_rate / 100
    END
  ), 0) as total_commission,
  COALESCE(SUM(p.price), 0) as total_amount
FROM referrals r
INNER JOIN properties p ON r.property_id = p.id
WHERE p.agent_id = $agent_id
AND (r.external = FALSE OR r.external IS NULL)
AND r.date >= $start_date 
AND r.date <= $end_date
AND p.status_id IN (SELECT id FROM statuses WHERE LOWER(code) IN ('sold', 'rented', 'closed'));
```

### D. Date Range Filtering

#### 1. Boundary Testing
- **Test**: Properties created exactly on start_date should be included
- **Test**: Properties created exactly on end_date should be included
- **Test**: Properties created before start_date should be excluded
- **Test**: Properties created after end_date should be excluded

#### 2. Time Zone Handling
- **Test**: Verify UTC normalization works correctly
- **Test**: Verify date comparisons use correct time boundaries (00:00:00 to 23:59:59)

### E. Edge Cases

#### 1. Missing Commission Settings
- **Test**: Verify default values are used when settings are missing
- **Expected Defaults**:
  - agent: 2%
  - finders: 1%
  - referral_internal: 0.5%
  - referral_external: 2%
  - team_leader: 1%
  - administration: 4%

#### 2. Zero Sales
- **Test**: Verify all commissions are 0 when sales_count = 0
- **Test**: Verify total_commission = 0

#### 3. No Referrals
- **Test**: Verify referral counts and commissions are 0
- **Test**: Verify total_commission still calculates correctly

#### 4. Decimal Precision
- **Test**: Verify all monetary values are rounded to 2 decimal places
- **Test**: Verify no floating-point precision errors

## Integration Test Structure

### Test Database Setup
1. Create test users (agents)
2. Create test properties with various dates
3. Create test leads with various sources
4. Create test viewings
5. Create test referrals (internal and external)
6. Set up commission settings

### Test Cases

#### Test Case 1: Basic Report Accuracy
```javascript
// Setup: Create agent, properties, sales, referrals
// Action: Generate report
// Verify: All counts and amounts match SQL queries
```

#### Test Case 2: Commission Calculation Accuracy
```javascript
// Setup: Known sales amount and commission rates
// Action: Generate report
// Verify: Each commission matches expected calculation
// Verify: Total commission equals sum of individual commissions
```

#### Test Case 3: Date Range Filtering
```javascript
// Setup: Properties with dates before, during, and after range
// Action: Generate report for specific date range
// Verify: Only properties in range are included
```

#### Test Case 4: Internal vs External Referrals
```javascript
// Setup: Mix of internal and external referrals
// Action: Generate report
// Verify: Correct commission rates applied
```

#### Test Case 5: Edge Cases
```javascript
// Test: Missing settings → defaults used
// Test: Zero sales → zero commissions
// Test: No referrals → zero referral commissions
```

## Manual Verification Checklist

When testing reports manually:

- [ ] Compare listings_count with actual property count in date range
- [ ] Compare lead_sources with actual lead counts by source
- [ ] Compare viewings_count with actual viewing count
- [ ] Compare sales_count with actual closed properties
- [ ] Verify sales_amount matches sum of closed property prices
- [ ] Verify each commission matches: `sales_amount * (rate / 100)`
- [ ] Verify total_commission = sum of all individual commissions
- [ ] Verify referral_received_commission matches SQL query
- [ ] Verify referrals_on_properties_commission matches SQL query
- [ ] Check date boundaries (inclusive start and end)
- [ ] Verify rounding to 2 decimal places
- [ ] Check for any negative values (should not occur)

## SQL Queries for Manual Verification

### Complete Report Verification Query
```sql
-- Replace $agent_id, $start_date, $end_date with actual values
WITH report_data AS (
  SELECT 
    -- Listings
    (SELECT COUNT(*) FROM properties 
     WHERE agent_id = $agent_id 
     AND created_at >= $start_date::timestamp 
     AND created_at <= $end_date::timestamp) as listings_count,
    
    -- Sales
    (SELECT COUNT(*), COALESCE(SUM(price), 0) 
     FROM properties 
     WHERE agent_id = $agent_id 
     AND closed_date >= $start_date::date 
     AND closed_date <= $end_date::date
     AND status_id IN (SELECT id FROM statuses WHERE LOWER(code) IN ('sold', 'rented', 'closed'))) as sales_data,
    
    -- Viewings
    (SELECT COUNT(*) FROM viewings 
     WHERE agent_id = $agent_id 
     AND viewing_date >= $start_date::date 
     AND viewing_date <= $end_date::date) as viewings_count,
    
    -- Referrals received
    (SELECT COUNT(DISTINCT p.id), COALESCE(SUM(p.price), 0)
     FROM properties p
     INNER JOIN referrals r ON p.id = r.property_id
     WHERE r.employee_id = $agent_id 
     AND p.closed_date >= $start_date::date 
     AND p.closed_date <= $end_date::date
     AND p.status_id IN (SELECT id FROM statuses WHERE LOWER(code) IN ('sold', 'rented', 'closed'))) as referrals_received
)
SELECT * FROM report_data;
```

## Automated Testing Recommendations

1. **Create Integration Test Suite**
   - Use test database with known data
   - Run after each deployment
   - Compare report output with SQL queries

2. **Add Calculation Validation**
   - Add assertions in report generation code
   - Log warnings when calculations don't match expected formulas
   - Add unit tests for each commission type

3. **Add Data Integrity Checks**
   - Verify date ranges are valid
   - Verify agent_id exists
   - Verify commission settings are valid percentages

4. **Performance Testing**
   - Test with large datasets
   - Verify queries are optimized
   - Check for N+1 query problems

## Common Issues to Watch For

1. **Date Boundary Issues**: Off-by-one errors in date comparisons
2. **Time Zone Issues**: UTC vs local time conversions
3. **Precision Issues**: Floating-point arithmetic errors
4. **Missing Data**: NULL handling in aggregations
5. **Commission Rate Changes**: Settings changed after report creation
6. **Referral External Flag**: Incorrect application of internal/external rates
















