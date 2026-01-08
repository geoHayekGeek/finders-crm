// Run address migration
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runAddressMigration() {
  try {
    console.log('🚀 Running address migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_address_to_users.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sqlContent);
    
    console.log('✅ Address migration completed successfully!');
    
    // Verify the column exists
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'address'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Address column verified:', result.rows[0]);
    } else {
      console.log('⚠️ Address column not found');
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runAddressMigration();

