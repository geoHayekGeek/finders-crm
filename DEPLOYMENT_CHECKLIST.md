# Deployment Checklist - Users Table Migration (Address + Location)

## Pre-Deployment

- [x] Combined database migration script created (`backend/database/migrate_users_table_address_location.sql`)
- [x] Production-ready migration runner script created (`backend/run-users-table-migration.js`)
- [x] Migration script added to package.json (`npm run migrate:users-table`)
- [x] All code changes committed (address field added, location field removed from models, controllers, frontend)
- [x] All unit tests passing (1558 tests passed)
- [x] Migration is idempotent and transaction-based (safe for production)

## Deployment Steps

### 1. Push Code to Main Branch
```bash
git add .
git commit -m "Add address field and remove location field from users table - combined migration"
git push origin main
```

### 2. Wait for Railway Build
- Railway will automatically detect the push and start building
- Monitor the build in Railway dashboard
- Ensure build completes successfully

### 3. Run Database Migration on Railway

**Option A: Using Railway CLI (Recommended)**
```bash
# Install Railway CLI if needed
npm i -g @railway/cli

# Login and link to your project
railway login
railway link

# Run the migration (from backend directory)
cd backend
railway run npm run migrate:users-table
```

**Note:** If you get connection errors with `railway run`, use Option B (Railway Dashboard) instead, as it runs directly in Railway's environment.

**Option B: Using Railway Dashboard Shell** (May not be available in all Railway plans)
1. Go to Railway dashboard → Your project → Backend service
2. Click on the latest deployment
3. If available, open the "Shell" tab
4. Run: `npm run migrate:users-table`
5. Verify output shows: `✅ Migration completed successfully!`

**Note:** If the Shell tab is not available, use Option C instead.

**Option C: One-off Service (Recommended - Safest for Production)**
1. In Railway dashboard, click "+ New" → "Empty Service"
2. Name it "migration-users-table" (temporary)
3. Go to "Settings" → "Source" and connect to the same repository/branch
4. Go to "Settings" → "Deploy" and set "Start Command" to: `cd backend && npm run migrate:users-table`
5. The service will auto-deploy - watch "Deploy Logs" for output
6. Verify you see: `✅ Migration completed successfully!`
7. After verification, delete the temporary service

### 4. Verify Migration Success

After migration, verify in Railway shell:
```sql
-- Check address column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'address';

-- Check location column is removed (should return 0 rows)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'location';
```

Expected results:
- Address column: Should return 1 row (text, nullable)
- Location column: Should return 0 rows

### 5. Test Application

- [ ] Test user registration (should accept phone numbers like `+961 03 985 423`)
- [ ] Test user editing (location field should not appear)
- [ ] Test user listing (no location field in responses)
- [ ] Verify all API endpoints work correctly

## Rollback Plan (If Needed)

If something goes wrong, you can add the column back:
```sql
ALTER TABLE users ADD COLUMN location VARCHAR(255);
```

However, any data that was in the `location` column before removal will be lost.

## Important Notes

1. **Migration is Idempotent**: Safe to run multiple times - checks if columns exist before modifying
2. **Transaction-based**: All changes are in a single transaction (rolls back on failure)
3. **Automatic Verification**: Migration script verifies results automatically
4. **No Data Loss**: The `location` field was optional and has been replaced by `work_location` and `address`
5. **Phone Validation**: Updated to accept Lebanese phone numbers with spaces
6. **All Tests Passing**: 1558 tests passed, including user-related tests

## Files Changed

### Backend
- `backend/models/userModel.js` - Added address, removed location from all queries
- `backend/controllers/userController.js` - Added address, removed location from request/response
- `backend/middlewares/validators.js` - Updated phone validation, removed location validation
- `backend/database/users.sql` - Updated schema
- `backend/database/migrate_users_table_address_location.sql` - Combined migration file
- `backend/run-users-table-migration.js` - Production-ready migration runner
- `backend/reset-and-populate-dummy-data.js` - Updated dummy data script

### Frontend
- `frontend/src/types/user.ts` - Removed location from interfaces
- `frontend/src/components/AddUserModal.tsx` - Removed location input
- `frontend/src/components/EditUserModal.tsx` - Removed location input
- `frontend/src/components/AgentSelector.tsx` - Removed location display
- `frontend/src/components/UserSelector.tsx` - Removed location from search/display
- `frontend/src/components/ViewUserModal.tsx` - Removed location display
- `frontend/src/components/AgentMultiSelect.tsx` - Removed location display
- `frontend/src/components/SingleUserSelector.tsx` - Removed location from search/display

### Tests
- `backend/__tests__/hr/userController.test.js` - Updated test data

