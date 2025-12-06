// Script to run the reference number update trigger migration
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
  const migrationFile = path.join(__dirname, 'database', 'migrations', 'add_reference_number_update_trigger.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('🔄 Running reference number update trigger migration...');
  console.log('📄 File:', migrationFile);
  
  try {
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
    // Test the trigger
    console.log('\n🧪 Testing the trigger...');
    try {
      // Get a test property to verify the trigger works
      const testProp = await pool.query(`
        SELECT id, reference_number, category_id, property_type
        FROM properties
        LIMIT 1
      `);
      
      if (testProp.rows.length > 0) {
        const prop = testProp.rows[0];
        console.log(`  Found test property: ${prop.reference_number}`);
        console.log(`  ✅ Trigger installed successfully`);
      } else {
        console.log('  ⚠️  No properties found to test trigger');
      }
    } catch (testError) {
      console.log('  ⚠️  Could not test trigger:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

