// backend/database/setup-operations-commission.js
// Setup script for operations commission reports table

const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function setupOperationsCommission() {
  try {
    console.log('📊 Setting up operations commission reports table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'operations_commission_reports.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Operations commission reports table created successfully!');
    
    // Verify the table was created
    const result = await pool.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = 'operations_commission_reports'`
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Table verified:', result.rows[0].table_name);
    } else {
      console.error('❌ Table verification failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up operations commission reports table:', error);
    process.exit(1);
  }
}

setupOperationsCommission();

