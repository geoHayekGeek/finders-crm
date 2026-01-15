// migrate-created-by.js
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migrateCreatedBy() {
  try {
    console.log('🚀 Starting created_by column migration...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add_created_by_to_properties.sql'),
      'utf8'
    );
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 The created_by column has been added to the properties table');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      AND column_name = 'created_by'
    `);
    
    if (result.rows.length > 0) {
      console.log('🔍 Column verification successful:', result.rows[0]);
    } else {
      console.log('❌ Column verification failed - column not found');
    }
    
    // Verify the index was created
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'properties' 
      AND indexname = 'idx_properties_created_by'
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('🔍 Index verification successful:', indexResult.rows[0].indexname);
    } else {
      console.log('⚠️  Index verification - index not found (may already exist)');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateCreatedBy()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCreatedBy };
