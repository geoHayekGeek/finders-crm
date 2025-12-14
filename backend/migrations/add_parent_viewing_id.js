// Migration script to add parent_viewing_id column to viewings table
const pool = require('../config/db');

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add parent_viewing_id to viewings table...');
    
    // Add the column if it doesn't exist
    await pool.query(`
      ALTER TABLE viewings 
      ADD COLUMN IF NOT EXISTS parent_viewing_id INTEGER REFERENCES viewings(id) ON DELETE CASCADE;
    `);
    console.log('✅ Added parent_viewing_id column to viewings table');
    
    // Create index if it doesn't exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_viewings_parent_viewing_id ON viewings(parent_viewing_id);
    `);
    console.log('✅ Created index on parent_viewing_id');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

