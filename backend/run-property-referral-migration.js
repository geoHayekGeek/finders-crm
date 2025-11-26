// run-property-referral-migration.js
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runPropertyReferralMigration() {
  try {
    console.log('🚀 Running property referral migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'add_property_referral_status.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Added columns: status, referred_to_agent_id, referred_by_user_id');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'referrals' 
      AND column_name IN ('status', 'referred_to_agent_id', 'referred_by_user_id')
      ORDER BY column_name
    `);
    
    if (result.rows.length > 0) {
      console.log('\n🔍 Column verification:');
      result.rows.forEach(row => {
        console.log(`   ✅ ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('❌ Column verification failed - columns not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42710') {
      console.log('⚠️  Some columns may already exist (this is okay)');
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
runPropertyReferralMigration();

