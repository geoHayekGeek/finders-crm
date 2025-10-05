// Migration to fix users table structure
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function fixUsersTable() {
  console.log('🚀 Fixing users table structure...\n');
  
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'database', 'fix-users-table.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    console.log('\n✅ Users table fixed successfully!\n');
    
    // Show updated structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Updated table structure:');
    console.table(columns.rows);
    
    // Show all users with their codes
    const users = await pool.query('SELECT id, name, email, user_code, is_active FROM users ORDER BY id');
    console.log('\n👥 All users:');
    console.table(users.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixUsersTable();
