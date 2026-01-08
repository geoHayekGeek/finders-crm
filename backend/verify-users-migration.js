// Quick script to verify users table migration status
require('dotenv').config();
const pool = require('./config/db');

async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking users table migration status...\n');
    
    // Check address column
    const addressCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'address'
      AND table_schema = 'public'
    `);
    
    // Check location column
    const locationCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'location'
      AND table_schema = 'public'
    `);
    
    console.log('📊 Migration Status:');
    console.log('─'.repeat(50));
    
    if (addressCheck.rows.length > 0) {
      console.log('✅ Address column: EXISTS');
      console.log(`   Type: ${addressCheck.rows[0].data_type}, Nullable: ${addressCheck.rows[0].is_nullable}`);
    } else {
      console.log('❌ Address column: NOT FOUND');
    }
    
    console.log('');
    
    if (locationCheck.rows.length === 0) {
      console.log('✅ Location column: REMOVED (as expected)');
    } else {
      console.log('⚠️  Location column: STILL EXISTS');
      console.log(`   Type: ${locationCheck.rows[0].data_type}`);
    }
    
    console.log('');
    console.log('─'.repeat(50));
    
    if (addressCheck.rows.length > 0 && locationCheck.rows.length === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('   Users table has address column and location column has been removed.');
      return true;
    } else {
      console.log('⚠️  Migration status: INCOMPLETE');
      if (addressCheck.rows.length === 0) {
        console.log('   - Address column needs to be added');
      }
      if (locationCheck.rows.length > 0) {
        console.log('   - Location column needs to be removed');
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error checking migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifyMigration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

