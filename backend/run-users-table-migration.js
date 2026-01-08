// Production-ready migration script for users table
// Combines: Add address column + Remove location column
// This script is idempotent and safe to run multiple times

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runUsersTableMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting users table migration...');
    console.log('   - Adding address column (if not exists)');
    console.log('   - Removing location column (if exists)');
    console.log('');
    console.log(`📁 Current directory: ${process.cwd()}`);
    console.log(`📁 Script directory: ${__dirname}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log('');
    
    // Check current state before migration
    console.log('🔍 Checking current table state...');
    const beforeAddress = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'address' AND table_schema = 'public'
    `);
    const beforeLocation = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'location' AND table_schema = 'public'
    `);
    console.log(`   Address column: ${beforeAddress.rows.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    console.log(`   Location column: ${beforeLocation.rows.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    console.log('');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'database', 'migrate_users_table_address_location.sql');
    console.log(`📄 Looking for migration file at: ${sqlPath}`);
    
    if (!fs.existsSync(sqlPath)) {
      // Try alternative path in case we're running from root
      const altPath = path.join(process.cwd(), 'backend', 'database', 'migrate_users_table_address_location.sql');
      console.log(`📄 Trying alternative path: ${altPath}`);
      if (fs.existsSync(altPath)) {
        console.log(`✅ Found migration file at alternative path`);
        const sqlContent = fs.readFileSync(altPath, 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sqlContent);
          await client.query('COMMIT');
          console.log('✅ Migration transaction committed successfully!');
          console.log('');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else {
        throw new Error(`Migration file not found at ${sqlPath} or ${altPath}`);
      }
    } else {
      console.log(`✅ Found migration file`);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      console.log(`📝 Migration SQL loaded (${sqlContent.length} characters)`);
      
      // Execute the migration within a transaction
      await client.query('BEGIN');
      
      try {
        await client.query(sqlContent);
        await client.query('COMMIT');
        
        console.log('✅ Migration transaction committed successfully!');
        console.log('');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during migration:', error.message);
        console.error('   Code:', error.code);
        console.error('   Detail:', error.detail);
        throw error;
      }
    }
    
    // Verify the migration results
    console.log('🔍 Verifying migration results...');
    
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
    
    console.log('');
    
    if (addressCheck.rows.length > 0) {
      console.log('✅ Address column: EXISTS');
      console.log(`   Type: ${addressCheck.rows[0].data_type}, Nullable: ${addressCheck.rows[0].is_nullable}`);
    } else {
      console.log('❌ Address column: NOT FOUND');
    }
    
    if (locationCheck.rows.length === 0) {
      console.log('✅ Location column: REMOVED (as expected)');
    } else {
      console.log('⚠️  Location column: STILL EXISTS (unexpected)');
      console.log(`   Type: ${locationCheck.rows[0].data_type}`);
    }
    
    console.log('');
    
    // Final status
    if (addressCheck.rows.length > 0 && locationCheck.rows.length === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('   Users table now has address column and location column has been removed.');
      return true;
    } else {
      console.log('⚠️  Migration completed with warnings. Please review the status above.');
      return false;
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  runUsersTableMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runUsersTableMigration };

