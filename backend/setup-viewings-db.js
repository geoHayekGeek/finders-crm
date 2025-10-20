// setup-viewings-db.js
// This script sets up the viewings and viewing_updates tables in the database

const pool = require('./config/db');
const fs = require('fs').promises;
const path = require('path');

async function setupViewingsDatabase() {
  console.log('🚀 Starting viewings database setup...');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'viewings.sql');
    const sql = await fs.readFile(sqlFilePath, 'utf8');

    // Execute the SQL
    console.log('📝 Executing SQL script...');
    await pool.query(sql);

    console.log('✅ Viewings database setup completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  - viewings');
    console.log('  - viewing_updates');
    console.log('');
    console.log('You can now start creating viewings in your application.');

  } catch (error) {
    console.error('❌ Error setting up viewings database:', error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the setup
setupViewingsDatabase()
  .then(() => {
    console.log('✅ Setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

