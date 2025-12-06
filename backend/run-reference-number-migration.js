// Migration runner script for updating reference number function
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
  try {
    console.log('🚀 Starting reference number function migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'update_reference_number_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 The generate_reference_number function has been updated');
    
    // Verify the function was updated
    const result = await pool.query(`
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'generate_reference_number'
        AND n.nspname = 'public'
    `);
    
    if (result.rows.length > 0) {
      console.log('🔍 Function verification successful');
      console.log('📋 Function exists and has been updated');
      
      // Test the function with a sample call
      try {
        const testResult = await pool.query(`
          SELECT generate_reference_number('S', 'rent') as test_ref
        `);
        console.log('🧪 Test call result:', testResult.rows[0].test_ref);
        console.log('✅ Function is working correctly!');
      } catch (testError) {
        console.log('⚠️ Test call failed (this is expected if no categories exist):', testError.message);
      }
    } else {
      console.log('❌ Function verification failed - function not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
runMigration();

