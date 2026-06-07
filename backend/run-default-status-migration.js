// run-default-status-migration.js
// Run migration to add is_default_status column to statuses table

const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runDefaultStatusMigration() {
  try {
    console.log('🚀 Running status migration: Adding is_default_status column...');

    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_is_default_status_to_statuses.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    const verifyQuery = `
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'statuses' AND column_name = 'is_default_status'
    `;

    const columnResult = await pool.query(verifyQuery);

    if (columnResult.rows.length > 0) {
      console.log('✅ Column verified:', columnResult.rows[0]);
    } else {
      console.log('⚠️  Column not found after migration');
    }

    const statusQuery = `
      SELECT id, name, code, is_default_status
      FROM statuses
      ORDER BY id
    `;
    const statusResult = await pool.query(statusQuery);

    console.log('\n📊 Current default status values:');
    statusResult.rows.forEach((status) => {
      console.log(`  - ${status.name} (${status.code}): is_default_status = ${status.is_default_status}`);
    });
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.code === '42710') {
      console.log('ℹ️  Column may already exist. This is okay.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runDefaultStatusMigration()
    .then(() => {
      console.log('\n🎉 Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runDefaultStatusMigration;
