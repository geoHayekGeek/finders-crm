// Run remove commission settings migration
// This script can be run locally or on Railway
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

async function runRemoveCommissionSettingsMigration() {
  try {
    console.log('🚀 Running remove commission settings migration...');

    const sqlPath = path.join(__dirname, 'database', 'migrations', 'remove_commission_settings.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sqlContent);

    console.log('✅ Remove commission settings migration completed successfully!');

    const result = await pool.query(`
      SELECT setting_key
      FROM system_settings
      WHERE setting_key LIKE 'commission_%'
      ORDER BY setting_key
    `);

    if (result.rows.length === 0) {
      console.log('✅ All commission settings were removed');
    } else {
      console.log('⚠️ Commission settings still present:', result.rows.map(row => row.setting_key));
    }
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

if (require.main === module) {
  runRemoveCommissionSettingsMigration();
}

module.exports = { runRemoveCommissionSettingsMigration };
