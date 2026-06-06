const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runClosureStatusMigration() {
  try {
    console.log('Running status closure migration...');

    const migrationPath = path.join(
      __dirname,
      'database',
      'migrations',
      'add_is_closure_status_to_statuses.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('Closure status migration completed successfully.');
  } catch (error) {
    console.error('Closure status migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runClosureStatusMigration();
}

module.exports = { runClosureStatusMigration };
