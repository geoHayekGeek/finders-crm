// Script to run the lead referral status migration
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting lead referral status migration...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add_lead_referral_status.sql'),
      'utf8'
    );
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Lead referral status migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();

