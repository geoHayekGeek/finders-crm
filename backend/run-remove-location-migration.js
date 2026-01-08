// Run remove location migration
// This script can be run locally or on Railway
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runRemoveLocationMigration() {
  try {
    console.log('🚀 Running remove location migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'remove_location_from_users.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sqlContent);
    
    console.log('✅ Remove location migration completed successfully!');
    
    // Verify the column doesn't exist
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'location'
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ Location column successfully removed');
    } else {
      console.log('⚠️ Location column still exists:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  runRemoveLocationMigration();
}

module.exports = { runRemoveLocationMigration };

