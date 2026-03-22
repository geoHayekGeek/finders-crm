// Idempotent: adds users.employment_start_date (required by getAllUsers / HR)
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

const MIGRATION_FILENAME = 'add_employment_start_date_to_users.sql';

function resolveSqlPath() {
  const primary = path.join(__dirname, 'database', MIGRATION_FILENAME);
  if (fs.existsSync(primary)) return primary;
  const fromRepoRoot = path.join(process.cwd(), 'backend', 'database', MIGRATION_FILENAME);
  if (fs.existsSync(fromRepoRoot)) return fromRepoRoot;
  return null;
}

async function runEmploymentStartDateMigration() {
  const sqlPath = resolveSqlPath();
  if (!sqlPath) {
    throw new Error(
      `Migration file not found. Expected backend/database/${MIGRATION_FILENAME}`
    );
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await pool.connect();

  try {
    console.log('Starting employment_start_date migration...');
    console.log(`SQL file: ${sqlPath}`);

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
      console.log('Migration committed.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    const verify = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'employment_start_date'
    `);
    if (verify.rows.length === 0) {
      console.error('Verification failed: column employment_start_date not found on users.');
      return false;
    }
    console.log('Verified: users.employment_start_date exists.');
    return true;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runEmploymentStartDateMigration()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error('Migration failed:', err.message);
      if (err.code) console.error('Code:', err.code);
      process.exit(1);
    });
}

module.exports = { runEmploymentStartDateMigration };
