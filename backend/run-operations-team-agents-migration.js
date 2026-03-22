// Idempotent migration: operations_team_agents table (operations manager ↔ agent assignments)
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

const MIGRATION_FILENAME = 'operations_team_agents.sql';

function resolveSqlPath() {
  const primary = path.join(__dirname, 'database', MIGRATION_FILENAME);
  if (fs.existsSync(primary)) return primary;
  const fromRepoRoot = path.join(process.cwd(), 'backend', 'database', MIGRATION_FILENAME);
  if (fs.existsSync(fromRepoRoot)) return fromRepoRoot;
  return null;
}

async function runOperationsTeamAgentsMigration() {
  const sqlPath = resolveSqlPath();
  if (!sqlPath) {
    throw new Error(
      `Migration file not found. Expected backend/database/${MIGRATION_FILENAME} (or cwd/backend/database/).`
    );
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = await pool.connect();

  try {
    console.log('Starting operations_team_agents migration...');
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
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'operations_team_agents'
    `);
    if (verify.rows.length === 0) {
      console.error('Verification failed: table operations_team_agents not found.');
      return false;
    }
    console.log('Verified: table operations_team_agents exists.');
    return true;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runOperationsTeamAgentsMigration()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error('Migration failed:', err.message);
      if (err.code) console.error('Code:', err.code);
      if (err.detail) console.error('Detail:', err.detail);
      process.exit(1);
    });
}

module.exports = { runOperationsTeamAgentsMigration };
