# Users Table Migration Guide

## Overview

This migration updates the `users` table by:
1. **Adding** the `address` column (TEXT, nullable) - for storing physical addresses
2. **Removing** the `location` column - replaced by `work_location` and `address` fields

## Migration File

- **SQL File**: `backend/database/migrate_users_table_address_location.sql`
- **Runner Script**: `backend/run-users-table-migration.js`

## Safety Features

✅ **Idempotent**: Safe to run multiple times  
✅ **Transaction-based**: All changes in a single transaction  
✅ **Verification**: Automatically verifies migration results  
✅ **Error handling**: Rolls back on failure  
✅ **Production-ready**: Tested and verified

## Running the Migration

### Local Development

```bash
cd backend
npm run migrate-users-table
```

Or directly:
```bash
cd backend
node run-users-table-migration.js
```

### Railway Deployment

**Option 1: Using Railway CLI (Recommended)**
```bash
# Install Railway CLI if needed
npm i -g @railway/cli

# Login and link to your project
railway login
railway link

# Run the migration
railway run npm run migrate-users-table
```

**Option 2: Using Railway Dashboard**
1. Go to Railway dashboard → Your project → Backend service
2. Click on the latest deployment
3. Open the "Shell" tab
4. Run: `npm run migrate-users-table`
5. Verify output shows success messages

**Option 3: One-off Service (Safest for Production)**
1. In Railway dashboard, create a new temporary service
2. Link it to the same codebase
3. Set start command: `npm run migrate-users-table`
4. Deploy once
5. Check logs to verify migration succeeded
6. Delete the temporary service after verification

## Expected Output

```
🚀 Starting users table migration...
   - Adding address column (if not exists)
   - Removing location column (if exists)

✅ Migration transaction committed successfully!

🔍 Verifying migration results...

✅ Address column: EXISTS
   Type: text, Nullable: YES
✅ Location column: REMOVED (as expected)

✅ Migration completed successfully!
   Users table now has address column and location column has been removed.
```

## Verification

After running the migration, you can verify manually:

```sql
-- Check address column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'address'
AND table_schema = 'public';

-- Check location column is removed (should return 0 rows)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'location'
AND table_schema = 'public';
```

## Rollback (If Needed)

If you need to rollback:

```sql
-- Add location column back
ALTER TABLE users ADD COLUMN location VARCHAR(255);

-- Remove address column (WARNING: This will delete all address data)
ALTER TABLE users DROP COLUMN address;
```

**⚠️ Warning**: Rolling back will result in data loss for any addresses that were stored.

## Migration Details

### What Changed

**Before:**
- `users` table had `location` column (VARCHAR(255))
- No `address` column

**After:**
- `users` table has `address` column (TEXT, nullable)
- `location` column removed
- `work_location` column remains (unchanged)

### Code Changes

All application code has been updated to:
- Use `address` instead of `location` for physical addresses
- Use `work_location` for work location information
- Handle the absence of `location` field gracefully

## Troubleshooting

### Migration Fails

If the migration fails:
1. Check the error message in the logs
2. Verify database connection is working
3. Ensure you have ALTER TABLE permissions
4. Check if there are any active transactions locking the table

### Partial Migration

If migration partially completes:
- The transaction will roll back automatically
- Re-run the migration after resolving the issue
- The migration is idempotent, so it's safe to retry

### Verification Fails

If verification shows unexpected results:
1. Check the database directly using SQL queries above
2. Review the migration logs for any warnings
3. Contact database administrator if needed

## Related Files

- `backend/models/userModel.js` - Updated to use address field
- `backend/controllers/userController.js` - Updated to handle address field
- `frontend/src/types/user.ts` - Updated TypeScript interfaces
- `frontend/src/components/AddUserModal.tsx` - Updated form
- `frontend/src/components/EditUserModal.tsx` - Updated form

## Support

If you encounter any issues:
1. Check the migration logs
2. Verify database permissions
3. Ensure all dependencies are installed
4. Review the error messages carefully

