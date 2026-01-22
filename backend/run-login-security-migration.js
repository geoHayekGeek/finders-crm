// Production-ready migration script for adding login security fields to users table
// This script is idempotent and safe to run multiple times

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runLoginSecurityMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting login security fields migration...');
    console.log('   - Adding failed_login_attempts column (if not exists)');
    console.log('   - Adding lockout_until column (if not exists)');
    console.log('   - Adding last_login_attempt column (if not exists)');
    console.log('   - Creating index for faster lookups');
    console.log('');
    console.log(`📁 Current directory: ${process.cwd()}`);
    console.log(`📁 Script directory: ${__dirname}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log('');
    
    // Check current state before migration
    console.log('🔍 Checking current table state...');
    const beforeCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('failed_login_attempts', 'lockout_until', 'last_login_attempt')
      AND table_schema = 'public'
    `);
    const existingColumns = beforeCheck.rows.map(row => row.column_name);
    console.log(`   failed_login_attempts: ${existingColumns.includes('failed_login_attempts') ? 'EXISTS' : 'NOT FOUND'}`);
    console.log(`   lockout_until: ${existingColumns.includes('lockout_until') ? 'EXISTS' : 'NOT FOUND'}`);
    console.log(`   last_login_attempt: ${existingColumns.includes('last_login_attempt') ? 'EXISTS' : 'NOT FOUND'}`);
    console.log('');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'database', 'add_login_security_fields.sql');
    console.log(`📄 Looking for migration file at: ${sqlPath}`);
    
    if (!fs.existsSync(sqlPath)) {
      // Try alternative path in case we're running from root
      const altPath = path.join(process.cwd(), 'backend', 'database', 'add_login_security_fields.sql');
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
    
    // Check all three columns
    const columnsCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('failed_login_attempts', 'lockout_until', 'last_login_attempt')
      AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    // Check index
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'idx_users_lockout_until'
    `);
    
    console.log('');
    
    const foundColumns = columnsCheck.rows.map(row => row.column_name);
    
    if (foundColumns.includes('failed_login_attempts')) {
      const col = columnsCheck.rows.find(r => r.column_name === 'failed_login_attempts');
      console.log('✅ failed_login_attempts column: EXISTS');
      console.log(`   Type: ${col.data_type}, Nullable: ${col.is_nullable}, Default: ${col.column_default || 'none'}`);
    } else {
      console.log('❌ failed_login_attempts column: NOT FOUND');
    }
    
    if (foundColumns.includes('lockout_until')) {
      const col = columnsCheck.rows.find(r => r.column_name === 'lockout_until');
      console.log('✅ lockout_until column: EXISTS');
      console.log(`   Type: ${col.data_type}, Nullable: ${col.is_nullable}`);
    } else {
      console.log('❌ lockout_until column: NOT FOUND');
    }
    
    if (foundColumns.includes('last_login_attempt')) {
      const col = columnsCheck.rows.find(r => r.column_name === 'last_login_attempt');
      console.log('✅ last_login_attempt column: EXISTS');
      console.log(`   Type: ${col.data_type}, Nullable: ${col.is_nullable}`);
    } else {
      console.log('❌ last_login_attempt column: NOT FOUND');
    }
    
    if (indexCheck.rows.length > 0) {
      console.log('✅ Index idx_users_lockout_until: EXISTS');
    } else {
      console.log('⚠️  Index idx_users_lockout_until: NOT FOUND');
    }
    
    console.log('');
    
    // Final status
    if (foundColumns.length === 3) {
      console.log('✅ Migration completed successfully!');
      console.log('   Users table now has login security fields for account lockout protection.');
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
  runLoginSecurityMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runLoginSecurityMigration };
