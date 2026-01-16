// Production-ready migration script for adding added_by column to users table
// This script is idempotent and safe to run multiple times

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runAddedByMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting added_by column migration...');
    console.log('   - Adding added_by column to users table (if not exists)');
    console.log('   - Adding foreign key constraint (if not exists)');
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
      WHERE table_name = 'users' AND column_name = 'added_by' AND table_schema = 'public'
    `);
    console.log(`   added_by column: ${beforeCheck.rows.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    console.log('');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'database', 'add_added_by_to_users.sql');
    console.log(`📄 Looking for migration file at: ${sqlPath}`);
    
    if (!fs.existsSync(sqlPath)) {
      // Try alternative path in case we're running from root
      const altPath = path.join(process.cwd(), 'backend', 'database', 'add_added_by_to_users.sql');
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
    
    // Check added_by column
    const addedByCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'added_by'
      AND table_schema = 'public'
    `);
    
    // Check foreign key constraint
    const fkCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_name = 'fk_users_added_by'
      AND table_schema = 'public'
    `);
    
    // Check index
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'idx_users_added_by'
    `);
    
    console.log('');
    
    if (addedByCheck.rows.length > 0) {
      console.log('✅ added_by column: EXISTS');
      console.log(`   Type: ${addedByCheck.rows[0].data_type}, Nullable: ${addedByCheck.rows[0].is_nullable}`);
    } else {
      console.log('❌ added_by column: NOT FOUND');
    }
    
    if (fkCheck.rows.length > 0) {
      console.log('✅ Foreign key constraint: EXISTS');
    } else {
      console.log('⚠️  Foreign key constraint: NOT FOUND');
    }
    
    if (indexCheck.rows.length > 0) {
      console.log('✅ Index: EXISTS');
    } else {
      console.log('⚠️  Index: NOT FOUND');
    }
    
    console.log('');
    
    // Final status
    if (addedByCheck.rows.length > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('   Users table now has added_by column to track who created each user account.');
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
  runAddedByMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runAddedByMigration };
