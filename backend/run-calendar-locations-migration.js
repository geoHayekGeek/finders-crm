const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runCalendarLocationsMigration() {
  try {
    console.log('Running calendar locations migration...');

    const migrationPath = path.join(
      __dirname,
      'database',
      'migrations',
      'add_calendar_locations.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);

    console.log('Calendar locations migration completed successfully.');
  } catch (error) {
    console.error('Calendar locations migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runCalendarLocationsMigration();
}

module.exports = { runCalendarLocationsMigration };
