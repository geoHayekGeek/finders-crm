// Migration to add is_active status to users
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function addUserStatus() {
  console.log('🚀 Adding user status column...\n');
  
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'database', 'add-user-status.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    console.log('✅ User status column added successfully\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUserStatus();
