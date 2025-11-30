// migrate-property-details.js
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migratePropertyDetails() {
  try {
    console.log('🚀 Starting property details migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrate_property_details_to_structured.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 The properties table has been updated with:');
    console.log('   - details column (now JSONB)');
    console.log('   - interior_details column (now JSONB)');
    console.log('   - payment_facilities column (BOOLEAN)');
    console.log('   - payment_facilities_specification column (TEXT)');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      AND column_name IN ('details', 'interior_details', 'payment_facilities', 'payment_facilities_specification')
      ORDER BY column_name
    `);
    
    if (result.rows.length > 0) {
      console.log('\n🔍 Column verification:');
      result.rows.forEach(row => {
        console.log(`   ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('❌ Column verification failed - columns not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
migratePropertyDetails();

