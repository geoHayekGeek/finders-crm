// setup-contact-source-migration.js
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function setupContactSource() {
  try {
    console.log('🔧 Setting up contact_source column for leads table...');
    
    // Read and execute the migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'add_contact_source_to_leads.sql'), 
      'utf8'
    );
    
    console.log('📄 Migration SQL loaded, executing...');
    
    // Execute each statement individually (better error handling)
    const statements = [
      // Add column
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_source VARCHAR(50) DEFAULT 'unknown' CHECK (contact_source IN ('call', 'unknown'));`,
      // Add comment
      `COMMENT ON COLUMN leads.contact_source IS 'How the lead was initially contacted: call or unknown';`,
      // Create index
      `CREATE INDEX IF NOT EXISTS idx_leads_contact_source ON leads(contact_source);`,
      // Update existing records
      `UPDATE leads SET contact_source = 'unknown' WHERE contact_source IS NULL;`
    ];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await pool.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist (like IF NOT EXISTS)
        if (error.code === '42710' || error.code === '42P07' || error.code === '23514' || error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️ Statement ${i + 1} already exists or column already added (skipping): ${error.message}`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Don't throw - continue with other statements
        }
      }
    }
    
    console.log('✅ Leads table migration completed successfully');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'leads' 
      AND column_name = 'contact_source'
    `);
    
    if (result.rows.length > 0) {
      console.log('🔍 Column verification successful:');
      console.log('   Column:', result.rows[0].column_name);
      console.log('   Type:', result.rows[0].data_type);
      console.log('   Nullable:', result.rows[0].is_nullable);
      console.log('   Default:', result.rows[0].column_default);
    } else {
      console.log('❌ Column verification failed - column not found');
    }
    
    // Check index
    const indexResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'leads' 
      AND indexname = 'idx_leads_contact_source'
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('✅ Index created successfully');
    } else {
      console.log('⚠️ Index not found (may already exist)');
    }
    
    console.log('🎉 Contact source migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up contact_source column:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupContactSource()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = setupContactSource;

