// Run team monthly reports migration
// This script can be run locally or on Railway
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runTeamReportsMigration() {
  try {
    console.log('🚀 Running team monthly reports migration...');

    const sqlPath = path.join(__dirname, 'database', 'migrations', 'add_team_monthly_reports.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sqlContent);

    console.log('✅ Team monthly reports migration completed successfully!');

    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'team_monthly_reports'
      ORDER BY ordinal_position
    `);

    if (result.rows.length > 0) {
      console.log(`✅ team_monthly_reports is ready with ${result.rows.length} columns`);
    }
  } catch (error) {
    console.error('❌ Error running team reports migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

if (require.main === module) {
  runTeamReportsMigration();
}

module.exports = { runTeamReportsMigration };
