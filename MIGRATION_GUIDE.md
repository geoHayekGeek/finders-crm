# Database Migration Guide

## Removing Location Field from Users Table

This migration removes the `location` column from the `users` table as it has been replaced by `work_location` and `address` fields.

### Migration File
- `backend/database/remove_location_from_users.sql`

### Running the Migration

#### Local Development
```bash
cd backend
npm run migrate-remove-location
```

Or directly:
```bash
cd backend
node run-remove-location-migration.js
```

#### Railway Deployment

**Option 1: Using Railway CLI (Recommended)**
```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run the migration
railway run npm run migrate-remove-location
```

### Migration Safety

The migration is **idempotent** - it safely checks if the column exists before attempting to drop it:
- If the column exists, it will be removed
- If the column doesn't exist, it will skip gracefully
- Safe to run multiple times

### Verification

After running the migration, verify it worked:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'location';
```

This should return 0 rows if the migration was successful.

### Rollback

If you need to rollback (add the column back), you can run:
```sql
ALTER TABLE users ADD COLUMN location VARCHAR(255);
```

However, note that any data that was in the `location` column before removal will be lost.

