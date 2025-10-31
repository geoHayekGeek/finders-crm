// add-closed-status.js
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function addClosedStatus() {
  try {
    console.log('🚀 Adding Closed status to database...');
    
    // Read and execute the migration
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add_closed_status.sql'),
      'utf8'
    );
    
    await pool.query(migrationSQL);
    
    console.log('✅ Closed status added successfully!');
    
    // Verify the status was added
    const result = await pool.query(`
      SELECT id, name, code, description, color
      FROM statuses 
      WHERE code = 'closed'
    `);
    
    if (result.rows.length > 0) {
      console.log('🔍 Closed status verification successful:', result.rows[0]);
    } else {
      console.log('❌ Closed status not found');
    }
    
  } catch (error) {
    console.error('❌ Failed to add Closed status:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addClosedStatus()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addClosedStatus };

