// Setup script for lead_referrals table
const pool = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function setupLeadReferralsDB() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up lead_referrals table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'lead_referrals.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded');
    
    await client.query('BEGIN');
    
    // Drop the table if it exists to recreate with new structure
    console.log('🗑️ Dropping existing table if present...');
    await client.query('DROP VIEW IF EXISTS leads_with_referrals CASCADE');
    await client.query('DROP TABLE IF EXISTS lead_referrals CASCADE');
    
    // Execute the setup SQL
    console.log('🏗️ Creating table with new structure...');
    await client.query(sql);
    
    await client.query('COMMIT');
    
    console.log('✅ lead_referrals table created successfully!');
    console.log('📊 Table now supports both employee and custom referrals');
    
    // Show the table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lead_referrals'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 lead_referrals table structure:');
    console.table(tableInfo.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupLeadReferralsDB()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });


