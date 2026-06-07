const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runLeadRolesMigration() {
  const client = await pool.connect();

  try {
    console.log('Running lead role migration...');

    const sqlPath = path.join(__dirname, 'database', 'migrations', 'add_lead_roles_to_leads.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('Lead role migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lead role migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runLeadRolesMigration();
}

module.exports = { runLeadRolesMigration };
