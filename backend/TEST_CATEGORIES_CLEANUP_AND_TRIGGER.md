# Test Categories Cleanup and Reference Number Update Trigger

## Summary

This document describes the cleanup of test categories and the implementation of an automatic reference number update trigger when property category or type changes.

## Changes Made

### 1. Test Categories Cleanup

**Script:** `backend/cleanup-test-categories.js`

- **Purpose:** Remove all test categories from the database and update properties that use them
- **Actions:**
  - Identifies test categories (categories not in the real categories list or with "Test" in the name)
  - Finds all properties using test categories
  - Updates properties to use the default category (Shop 'S')
  - Regenerates reference numbers for updated properties
  - Deletes test categories

**Results:**
- ✅ Removed 15 test categories
- ✅ Updated 18 properties to use real categories
- ✅ All properties now have valid reference numbers

### 2. Reference Number Update Trigger

**Migration:** `backend/database/migrations/add_reference_number_update_trigger.sql`

- **Purpose:** Automatically update property reference numbers when `category_id` or `property_type` changes
- **Implementation:**
  - Created `update_property_reference_number()` trigger function
  - Trigger fires `BEFORE UPDATE` on the `properties` table
  - Only executes when `category_id` or `property_type` actually changes
  - Automatically generates a new reference number using the updated category and type

**How it works:**
1. When a property's `category_id` or `property_type` is updated
2. The trigger function extracts the new category code
3. Generates a new reference number using `generate_reference_number()`
4. Updates the property's `reference_number` field automatically

**Example:**
```sql
-- Before: Property has category_id = 10 (PB - Pub), reference_number = 'FSPB251'
UPDATE properties SET category_id = 2 WHERE id = 1;
-- After: reference_number automatically updated to 'FSC2599' (using category C - Chalet)
```

### 3. Test File Updates

**File:** `backend/__tests__/models/referenceNumberGeneration.test.js`

- **Changes:**
  - Removed all test category creation logic
  - Updated tests to use real categories (Shop 'S', Warehouse 'W', Land 'L', Office 'O')
  - Tests now clean up properly without leaving test categories behind

**Benefits:**
- Tests no longer pollute the database with test categories
- Tests use real, production-like data
- All 9 unit tests passing ✅

## Files Created/Modified

### Created Files:
1. `backend/cleanup-test-categories.js` - Cleanup script
2. `backend/database/migrations/add_reference_number_update_trigger.sql` - Trigger migration
3. `backend/run-reference-number-trigger-migration.js` - Migration runner
4. `backend/test-reference-number-trigger.js` - Trigger test script
5. `backend/TEST_CATEGORIES_CLEANUP_AND_TRIGGER.md` - This documentation

### Modified Files:
1. `backend/__tests__/models/referenceNumberGeneration.test.js` - Updated to use real categories

## Running the Scripts

### Cleanup Test Categories
```bash
cd backend
node cleanup-test-categories.js
```

### Run Migration
```bash
cd backend
node run-reference-number-trigger-migration.js
```

### Test the Trigger
```bash
cd backend
node test-reference-number-trigger.js
```

### Run Unit Tests
```bash
cd backend
npm test -- referenceNumberGeneration.test.js
```

## Verification

✅ All test categories removed  
✅ All properties updated to use real categories  
✅ Reference numbers regenerated correctly  
✅ Trigger installed and working  
✅ All unit tests passing (9/9)  
✅ Trigger automatically updates reference numbers on category/type change  

## Notes

- The trigger only fires when `category_id` or `property_type` actually changes (using `IS DISTINCT FROM`)
- The trigger uses the `generate_reference_number()` function to ensure consistency
- Reference numbers are globally unique, so changing category/type will result in a new unique ID
- The cleanup script uses Shop 'S' as the default category for properties with test categories

