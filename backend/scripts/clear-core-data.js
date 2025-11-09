/**
 * Script to clear core CRM data tables:
 * - Calendar events (and associated reminders)
 * - Viewings (and updates)
 * - Leads (and related notes/referrals)
 * - Properties (and related referrals)
 * - Monthly agent reports
 *
 * Usage:
 *   node scripts/clear-core-data.js
 *
 * Ensure the environment variables for database connection are set
 * before running this script (see backend/env.example).
 */

const pool = require('../config/db');

const tablesToClear = [
  { table: 'viewing_update_reminders', label: 'viewing update reminder entries' },
  { table: 'reminder_tracking', label: 'reminder tracking entries' },
  { table: 'viewing_updates', label: 'viewing updates' },
  { table: 'viewings', label: 'viewings' },
  { table: 'calendar_events', label: 'calendar events' },
  { table: 'monthly_agent_reports', label: 'monthly agent reports' },
  { table: 'lead_referrals', label: 'lead referrals' },
  { table: 'referrals', label: 'property referrals' },
  { table: 'leads', label: 'leads' },
  { table: 'properties', label: 'properties' },
];

async function clearCoreData() {
  const client = await pool.connect();

  try {
    console.log('🚨 Starting core data cleanup...');
    await client.query('BEGIN');

    const results = [];

    for (const { table, label } of tablesToClear) {
      const { rowCount } = await client.query(`DELETE FROM ${table}`);
      results.push({ label, rowCount });
      console.log(`   • Cleared ${rowCount} ${label}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Core data cleanup complete.\n');
    console.table(results.map(({ label, rowCount }) => ({ table: label, deleted: rowCount })));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clear core data. Transaction rolled back.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  clearCoreData().catch((error) => {
    console.error('Unexpected error during cleanup:', error);
    process.exitCode = 1;
  });
}


