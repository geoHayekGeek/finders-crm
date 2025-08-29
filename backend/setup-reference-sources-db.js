// setup-reference-sources-db.js
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function setupReferenceSources() {
  try {
    console.log('🔧 Setting up reference sources table...');
    
    // Read and execute reference sources table creation
    const referenceSourcesSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'reference_sources.sql'), 
      'utf8'
    );
    await pool.query(referenceSourcesSQL);
    console.log('✅ Reference sources table created successfully');
    
    // Read and execute leads table migration
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add_reference_source_and_operations.sql'), 
      'utf8'
    );
    await pool.query(migrationSQL);
    console.log('✅ Leads table migration completed successfully');
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupReferenceSources()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupReferenceSources;
