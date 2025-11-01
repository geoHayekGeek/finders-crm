// Quick script to run the monthly_agent_reports migration
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('📊 Running monthly_agent_reports migration...');
    
    const sqlPath = path.join(__dirname, 'monthly_agent_reports.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('✅ Table "monthly_agent_reports" created');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_agent_reports'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n✅ Table has ${result.rows.length} columns:`);
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

