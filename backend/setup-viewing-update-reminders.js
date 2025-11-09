// setup-viewing-update-reminders.js
// Creates the viewing_update_reminders tracking table

const fs = require('fs').promises;
const path = require('path');
const pool = require('./config/db');

async function setupViewingUpdateReminders() {
  console.log('🚀 Setting up viewing update reminder tracking table...');

  try {
    const sqlPath = path.join(__dirname, 'database', 'viewing_update_reminders.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    console.log('📝 Executing SQL script...');
    await pool.query(sql);

    console.log('✅ viewing_update_reminders table ready.');
  } catch (error) {
    console.error('❌ Failed to set up viewing update reminder tracking:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupViewingUpdateReminders()
  .then(() => {
    console.log('✅ Setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });


