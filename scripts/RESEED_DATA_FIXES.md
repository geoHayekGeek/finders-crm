# Data Reseeding Script - Fixes and Issues Found

## Issues Fixed

### 1. Missing Sequence Resets
**Issue**: The script was only resetting 4 sequences but there are 6 tables with SERIAL primary keys:
- `properties_id_seq` ✅
- `leads_id_seq` ✅
- `viewings_id_seq` ✅
- `referrals_id_seq` ✅
- `lead_referrals_id_seq` ❌ (was missing)
- `viewing_updates_id_seq` ❌ (was missing)

**Fix**: Added sequence resets for all 6 sequences with error handling using `IF EXISTS` to prevent errors if sequences don't exist.

### 2. Property Details Format
**Issue**: The `generatePropertyDetails()` and `generateInteriorDetails()` functions were returning JSON strings, but the `Property.createProperty()` method expects objects and handles the JSONB conversion internally.

**Fix**: Changed both functions to return objects instead of JSON strings. The Property model will handle the conversion to JSONB format.

### 3. Database Connection Error Handling
**Issue**: The script didn't handle cases where sequences might not exist or have different names.

**Fix**: Added try-catch blocks around sequence resets with `IF EXISTS` clause to gracefully handle missing sequences.

## Verified Correct Behavior

✅ **Deletion Order**: Correct order maintained to respect foreign key constraints:
1. `viewing_updates` (references viewings)
2. `viewings` (references properties, leads, users)
3. `referrals` (references properties, users)
4. `properties` (references statuses, categories, users)
5. `lead_referrals` (references leads, users)
6. `leads` (references users)

✅ **Required Fields**: All required fields are properly set:
- Properties: All required fields including status_id, category_id, agent_id
- Leads: operations_id is always set (required field)
- Viewings: All required fields including property_id, lead_id, agent_id

✅ **Data Relationships**: 
- Viewings correctly link properties to leads
- Referrals correctly link to properties
- All entities are assigned to agents/team leaders

✅ **Error Handling**: 
- Individual entity creation errors are caught and logged without stopping the entire process
- Database transaction rollback on errors
- Proper connection cleanup

## Potential Issues to Watch For

### 1. Database Connection
The script requires proper database configuration in `.env` file:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database
DB_PORT=5432
```

If you see "client password must be a string" error, check your `.env` file.

### 2. Missing Reference Data
The script requires:
- At least one status in `statuses` table
- At least one category in `categories` table
- At least one operations user (role: 'operations' or 'operations_manager')
- At least one agent or team leader

### 3. Sequence Naming
PostgreSQL sequence names follow the pattern: `{table_name}_{column_name}_seq`. If your database uses different naming, the sequence resets might fail silently (but this is handled gracefully).

### 4. Property Status Validation
If creating properties with "closed" statuses (sold, rented, closed), the script doesn't set `closed_date`. The Property model will throw an error if this is required. Currently, the script only uses active statuses randomly, so this shouldn't be an issue, but be aware.

## Testing Recommendations

1. **Test with small counts first**:
   - Properties: 5-10
   - Leads: 10-20
   - Viewings: 5-10

2. **Verify data integrity**:
   ```sql
   -- Check property assignments
   SELECT COUNT(*), agent_id FROM properties GROUP BY agent_id;
   
   -- Check lead assignments
   SELECT COUNT(*), agent_id FROM leads GROUP BY agent_id;
   
   -- Check viewing relationships
   SELECT COUNT(*) FROM viewings v
   JOIN properties p ON v.property_id = p.id
   JOIN leads l ON v.lead_id = l.id;
   
   -- Check referrals
   SELECT COUNT(*) FROM referrals;
   ```

3. **Check for orphaned records**:
   ```sql
   -- Viewings without valid properties
   SELECT COUNT(*) FROM viewings v
   LEFT JOIN properties p ON v.property_id = p.id
   WHERE p.id IS NULL;
   
   -- Viewings without valid leads
   SELECT COUNT(*) FROM viewings v
   LEFT JOIN leads l ON v.lead_id = l.id
   WHERE l.id IS NULL;
   ```

## Script Status

✅ **Ready for use** - All identified issues have been fixed. The script should work correctly with a properly configured database.










