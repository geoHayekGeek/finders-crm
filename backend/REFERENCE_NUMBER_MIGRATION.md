# Reference Number Migration Guide

## Overview

This migration updates the property reference number generation function to use a new format:
- **Old Format**: `F + Category + Type + Year + Random`
- **New Format**: `F + PropertyType + Category + Year + SequentialID`

## New Format Details

- **F** = Finders (always)
- **PropertyType** = S (Sale) or R (Rent) - comes BEFORE category
- **Category** = Category code (e.g., S for Shop, A for Apartment)
- **Year** = Last 2 digits of current year (e.g., 25 for 2025)
- **SequentialID** = 3-digit number starting at 001 for each year

### Examples
- `FRS25001` - First Rent Shop property in 2025
- `FRS25002` - Second Rent Shop property in 2025
- `FSA25001` - First Sale Apartment property in 2025
- `FRA25001` - First Rent Apartment property in 2025

## Migration Steps

### 1. Run the Migration

```bash
cd backend
node run-reference-number-migration.js
```

This will update the `generate_reference_number` function in the database.

### 2. Reset Existing Reference Numbers (Optional)

If you want to update all existing properties to use the new format:

```bash
cd backend
node reset-all-reference-numbers.js --confirm
```

**⚠️ WARNING**: This will update ALL property reference numbers. Make sure you have a database backup before running this!

The reset script will:
- Group properties by type + category + year
- Generate sequential IDs starting from 001 for each group
- Update all properties in a transaction
- Verify uniqueness of all reference numbers

### 3. Run Tests

```bash
cd backend
npm test -- referenceNumberGeneration.test.js
```

## Files Created

1. **`backend/database/migrations/update_reference_number_function.sql`**
   - SQL migration file that updates the function

2. **`backend/run-reference-number-migration.js`**
   - Script to run the migration

3. **`backend/reset-all-reference-numbers.js`**
   - Script to reset and regenerate all existing reference numbers

4. **`backend/__tests__/models/referenceNumberGeneration.test.js`**
   - Unit tests for the reference number generation function

## Testing

The unit tests verify:
- ✅ Correct format (F + Type + Category + Year + ID)
- ✅ Property type placement (S/R comes before category)
- ✅ Sequential ID generation (starts at 001, increments properly)
- ✅ Year handling (uses current year)
- ✅ Category code handling (single and multi-character)
- ✅ Uniqueness of generated reference numbers

## Notes

- New properties created after the migration will automatically use the new format
- Existing properties will keep their old reference numbers unless you run the reset script
- The sequential ID resets to 001 each year for each property type + category combination
- The function handles variable-length category codes correctly

