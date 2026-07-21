// migrate-closing-fields.js
// Migration script to add closing fields to properties table
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function migrateClosingFields() {
  try {
    console.log('🚀 Starting migration: Add closing fields to properties table...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add_closing_fields_to_properties.sql'),
      'utf8'
    );
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 The following columns have been added to the properties table:');
    console.log('   - sold_amount (DECIMAL)');
    console.log('   - buyer_id (INTEGER, FK to leads)');
    console.log('   - agent_commission (DECIMAL)');
    console.log('   - finders_commission (DECIMAL)');
    console.log('   - team_leader_commission (DECIMAL)');
    console.log('   - administration_commission (DECIMAL)');
    console.log('   - commission (DECIMAL)');
    console.log('   - platform_id (INTEGER, FK to reference_sources)');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      AND column_name IN ('sold_amount', 'buyer_id', 'agent_commission', 'finders_commission', 'team_leader_commission', 'administration_commission', 'commission', 'platform_id')
      ORDER BY column_name
    `);
    
    if (result.rows.length > 0) {
      console.log('🔍 Column verification successful:');
      result.rows.forEach(row => {
        console.log(`   ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('❌ Column verification failed - columns not found');
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
  migrateClosingFields()
    .then(() => {
      console.log('🎉 Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateClosingFields };

