const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('📊 Adding external column to referrals table...');
    
    const sqlPath = path.join(__dirname, 'migrations', 'add_external_to_referrals.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Column "external" added to referrals table');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'referrals' AND column_name = 'external'
    `);
    
    if (result.rows.length > 0) {
      console.log(`\n✅ Column verified:`, result.rows[0]);
    } else {
      console.log(`\n⚠️  Column not found, but migration completed`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

