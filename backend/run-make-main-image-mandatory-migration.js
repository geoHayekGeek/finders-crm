// Production-ready migration script to make main_image mandatory
// This script is idempotent and safe to run multiple times

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runMakeMainImageMandatoryMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting make main_image mandatory migration...');
    console.log('   - Setting placeholder for existing NULL main_image values');
    console.log('   - Making main_image column NOT NULL');
    console.log('');
    console.log(`📁 Current directory: ${process.cwd()}`);
    console.log(`📁 Script directory: ${__dirname}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log('');
    
    // Check current state before migration
    console.log('🔍 Checking current table state...');
    const beforeCheck = await client.query(`
      SELECT 
        column_name, 
        is_nullable,
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      AND column_name = 'main_image' 
      AND table_schema = 'public'
    `);
    
    if (beforeCheck.rows.length === 0) {
      throw new Error('main_image column does not exist in properties table');
    }
    
    const nullCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM properties 
      WHERE main_image IS NULL
    `);
    
    console.log(`   main_image column: EXISTS`);
    console.log(`   Current nullable: ${beforeCheck.rows[0].is_nullable}`);
    console.log(`   Properties with NULL main_image: ${nullCount.rows[0].count}`);
    console.log('');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'database', 'make_main_image_mandatory.sql');
    console.log(`📄 Looking for migration file at: ${sqlPath}`);
    
    if (!fs.existsSync(sqlPath)) {
      // Try alternative path in case we're running from root
      const altPath = path.join(process.cwd(), 'backend', 'database', 'make_main_image_mandatory.sql');
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
    
    const afterCheck = await client.query(`
      SELECT 
        column_name, 
        is_nullable,
        data_type
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      AND column_name = 'main_image'
      AND table_schema = 'public'
    `);
    
    const nullCountAfter = await client.query(`
      SELECT COUNT(*) as count 
      FROM properties 
      WHERE main_image IS NULL
    `);
    
    console.log('');
    console.log(`   main_image column nullable: ${afterCheck.rows[0].is_nullable}`);
    console.log(`   Properties with NULL main_image: ${nullCountAfter.rows[0].count}`);
    console.log('');
    
    // Final status
    if (afterCheck.rows[0].is_nullable === 'NO' && nullCountAfter.rows[0].count === '0') {
      console.log('✅ Migration completed successfully!');
      console.log('   main_image column is now mandatory (NOT NULL).');
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
  runMakeMainImageMandatoryMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMakeMainImageMandatoryMigration };
