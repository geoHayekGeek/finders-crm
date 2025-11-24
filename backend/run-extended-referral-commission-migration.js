// run-extended-referral-commission-migration.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

require('dotenv').config();

async function runMigration() {
  try {
    console.log('🚀 Starting extended referral commission migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_extended_referral_commission.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 The commission_referral_extended_percentage setting has been added');
    
    // Verify the setting was added
    const result = await pool.query(`
      SELECT setting_key, setting_value, setting_type, description
      FROM system_settings 
      WHERE setting_key = 'commission_referral_extended_percentage'
    `);
    
    if (result.rows.length > 0) {
      console.log('🔍 Setting verification successful:', result.rows[0]);
    } else {
      console.log('❌ Setting verification failed - setting not found');
    }
    
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation - setting already exists
      console.log('⚠️ Setting already exists (skipping)');
    } else {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
runMigration();

