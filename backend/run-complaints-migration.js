// run-complaints-migration.js
// Run migration to add complaints table

const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runComplaintsMigration() {
  try {
    console.log('🚀 Running complaints migration: Adding complaints table...');

    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_complaints.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...');
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'complaints'
    `;

    const tableResult = await pool.query(verifyQuery);

    if (tableResult.rows.length > 0) {
      console.log('✅ Table verified: complaints');
    } else {
      console.log('⚠️  complaints table not found after migration');
    }

    const countResult = await pool.query('SELECT COUNT(*)::int AS complaint_count FROM complaints');
    console.log(`📊 Current complaints count: ${countResult.rows[0]?.complaint_count || 0}`);
  } catch (error) {
    console.error('❌ Error running complaints migration:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Table may already exist. This is okay.');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runComplaintsMigration()
    .then(() => {
      console.log('\n🎉 Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = runComplaintsMigration;
