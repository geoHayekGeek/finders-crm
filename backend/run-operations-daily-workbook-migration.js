// run-operations-daily-workbook-migration.js
// Idempotent database repair for existing operations_daily_reports tables.

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runOperationsDailyWorkbookMigration() {
  const sqlPath = path.join(__dirname, 'database', 'migrations', 'add_operations_daily_workbook_fields.sql');

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration file not found: ${sqlPath}`);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const migrationSQL = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  console.log('🚀 Running operations daily workbook field migration...');
  console.log(`📄 File: ${sqlPath}`);

  await client.connect();

  try {
    await client.query(migrationSQL);

    const verification = await client.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'operations_daily_reports'
          AND column_name = ANY($1::text[])
        ORDER BY column_name
      `,
      [[
        'properties_added',
        'leads_responded_to',
        'amending_previous_properties',
        'preparing_daily_report',
        'phone_calls_duty_time',
        'replying_to_msg_on_sm_duty_time',
        'cvs',
        'filling',
        'preparing_contract',
        'tasks_efficiency',
        'phone_calls_out_of_duty_time',
        'replying_to_msg_on_sm_out_of_duty_time',
        'replying_to_whats_up_msg_out_of_duty_time',
        'tasks_efficiency_duty_time',
        'tasks_efficiency_uniform',
        'tasks_efficiency_after_duty',
        'leads_responded_out_of_duty_time'
      ]]
    );

    console.log(`✅ Verified ${verification.rows.length} operations daily columns exist`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runOperationsDailyWorkbookMigration()
    .then(() => {
      console.log('🎉 Operations daily workbook field migration completed successfully');
    })
    .catch((error) => {
      console.error('❌ Operations daily workbook field migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { runOperationsDailyWorkbookMigration };
