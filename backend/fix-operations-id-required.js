// fix-operations-id-required.js
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function fixOperationsIdRequired() {
  try {
    console.log('🔧 Making operations_id required in leads table...');
    
    // Read and execute the migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'make_operations_id_required.sql'), 
      'utf8'
    );
    
    console.log('📄 Migration SQL loaded, executing...');
    
    // Execute the entire migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully');
    
    // Verify the constraint was added
    const constraintCheck = await pool.query(`
      SELECT 
        column_name,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      AND column_name = 'operations_id'
    `);
    
    if (constraintCheck.rows.length > 0) {
      const col = constraintCheck.rows[0];
      console.log('🔍 Column verification:');
      console.log('   Column:', col.column_name);
      console.log('   Nullable:', col.is_nullable);
      console.log('   Default:', col.column_default);
      
      if (col.is_nullable === 'NO') {
        console.log('✅ NOT NULL constraint successfully applied!');
      } else {
        console.log('⚠️ Warning: Column is still nullable');
      }
    }
    
    // Check for any remaining NULL values
    const nullCheck = await pool.query(`
      SELECT COUNT(*) as null_count
      FROM leads
      WHERE operations_id IS NULL
    `);
    
    const nullCount = parseInt(nullCheck.rows[0].null_count);
    if (nullCount === 0) {
      console.log('✅ All leads have operations_id set');
    } else {
      console.log(`⚠️ Warning: ${nullCount} leads still have NULL operations_id`);
    }
    
    console.log('🎉 Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing operations_id requirement:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix if this file is executed directly
if (require.main === module) {
  fixOperationsIdRequired()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = fixOperationsIdRequired;

