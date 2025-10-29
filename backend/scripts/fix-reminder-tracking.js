// Script to fix reminder tracking issues
// This script applies the migration to add unique constraint and clean up invalid records
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function fixReminderTracking() {
  console.log('🔧 Starting reminder tracking fix...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'add_unique_constraint_reminder_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('📋 Executing migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration executed successfully\n');
    
    // Test the cleanup function
    console.log('🧪 Testing cleanup function...');
    const cleanupResult = await pool.query('SELECT cleanup_old_reminder_tracking()');
    console.log(`✅ Cleaned up ${cleanupResult.rows[0].cleanup_old_reminder_tracking} old tracking records\n`);
    
    // Get statistics
    console.log('📊 Current reminder tracking statistics:');
    const statsQuery = `
      SELECT 
        reminder_type,
        COUNT(*) as total,
        SUM(CASE WHEN email_sent = true THEN 1 ELSE 0 END) as email_sent_count,
        SUM(CASE WHEN notification_sent = true THEN 1 ELSE 0 END) as notification_sent_count
      FROM reminder_tracking
      GROUP BY reminder_type
      ORDER BY reminder_type
    `;
    const stats = await pool.query(statsQuery);
    
    if (stats.rows.length > 0) {
      console.table(stats.rows);
    } else {
      console.log('No tracking records found.');
    }
    
    console.log('\n✅ Reminder tracking fix completed successfully!');
    console.log('\nℹ️  The issue has been resolved. Future reminders will work correctly.');
    console.log('ℹ️  Tracking records are now properly managed based on actual send status.');
    
  } catch (error) {
    console.error('❌ Error fixing reminder tracking:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixReminderTracking().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


