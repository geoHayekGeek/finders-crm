// run-rename-referral-commission-settings.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

require('dotenv').config();

async function runMigration() {
  try {
    console.log('🚀 Starting referral commission settings rename migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'rename_referral_commission_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 The referral commission settings have been renamed:');
    console.log('   - commission_referral_percentage → commission_referral_internal_percentage');
    console.log('   - commission_referral_extended_percentage → commission_referral_external_percentage');
    
    // Verify the settings were renamed
    const result = await pool.query(`
      SELECT setting_key, setting_value, description
      FROM system_settings 
      WHERE setting_key IN ('commission_referral_internal_percentage', 'commission_referral_external_percentage')
      ORDER BY setting_key
    `);
    
    if (result.rows.length === 2) {
      console.log('\n🔍 Settings verification:');
      result.rows.forEach(row => {
        console.log(`   ✅ ${row.setting_key}: ${row.setting_value}% - ${row.description}`);
      });
    } else {
      console.log('⚠️ Warning: Expected 2 settings, found', result.rows.length);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
runMigration();

