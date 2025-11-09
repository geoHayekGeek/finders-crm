// Script to fix notification entity_type constraint to include 'viewing' and 'calendar_event'
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function fixNotificationEntityTypes() {
  console.log('🔧 Fixing notification entity_type constraint...\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'database', 'fix-notification-entity-types.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Successfully updated notification entity_type constraint!');
    console.log('   Valid entity types are now: property, lead, user, system, viewing, calendar_event\n');

    // Verify the change
    const result = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conname = 'notifications_entity_type_check'
    `);

    if (result.rows.length > 0) {
      console.log('📋 Current constraint definition:');
      console.log('   ', result.rows[0].constraint_definition);
    }

  } catch (error) {
    console.error('❌ Error fixing notification entity types:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
fixNotificationEntityTypes();

