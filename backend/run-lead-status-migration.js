// run-lead-status-migration.js
// Run migration to add can_be_referred column to lead_statuses table

const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runLeadStatusMigration() {
  try {
    console.log('🚀 Running lead status migration: Adding can_be_referred column...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'add_can_be_referred_to_lead_statuses.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the column was added
    const verifyQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'lead_statuses' AND column_name = 'can_be_referred'
    `;
    
    const result = await pool.query(verifyQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verified:', result.rows[0]);
    } else {
      console.log('⚠️  Column not found after migration');
    }
    
    // Show current lead status values
    const statusQuery = 'SELECT id, status_name, can_be_referred FROM lead_statuses ORDER BY id';
    const statusResult = await pool.query(statusQuery);
    console.log('\n📊 Current lead status values:');
    statusResult.rows.forEach(status => {
      console.log(`  - ${status.status_name}: can_be_referred = ${status.can_be_referred}`);
    });
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.code === '42710') {
      console.log('ℹ️  Column may already exist. This is okay.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runLeadStatusMigration()
    .then(() => {
      console.log('\n🎉 Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runLeadStatusMigration;

