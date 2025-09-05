// Migration script to add property_url column to properties table
const pool = require('./config/db');

async function addPropertyUrlColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Adding property_url column to properties table...');
    
    await client.query('BEGIN');
    
    // Check if column already exists
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'properties' 
      AND column_name = 'property_url'
    `);
    
    if (columnExists.rows.length > 0) {
      console.log('✅ Column property_url already exists, skipping migration');
      await client.query('COMMIT');
      return;
    }
    
    // Add the property_url column
    await client.query(`
      ALTER TABLE properties 
      ADD COLUMN property_url TEXT
    `);
    
    // Add comment to the column
    await client.query(`
      COMMENT ON COLUMN properties.property_url IS 'Optional property URL (e.g., listing URL from external sites)'
    `);
    
    await client.query('COMMIT');
    console.log('✅ Successfully added property_url column to properties table');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding property_url column:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addPropertyUrlColumn()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addPropertyUrlColumn };
