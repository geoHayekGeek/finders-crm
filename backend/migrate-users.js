// migrate-users.js
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function migrateUsersTable() {
  try {
    console.log('🚀 Migrating users table to add new columns...');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_user_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sqlContent);
    console.log('✅ Migration completed successfully!');
    
    // Verify the new columns exist
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Users table columns after migration:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if we have the new columns
    const hasDob = columnsResult.rows.some(col => col.column_name === 'dob');
    const hasUserCode = columnsResult.rows.some(col => col.column_name === 'user_code');
    
    if (hasDob && hasUserCode) {
      console.log('🎉 Successfully added DOB and user_code columns!');
    } else {
      console.log('⚠️ Some columns may not have been added properly');
    }
    
  } catch (error) {
    console.error('💥 Error during migration:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateUsersTable();
