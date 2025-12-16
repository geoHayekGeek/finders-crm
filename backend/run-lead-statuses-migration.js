const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running migration: Add can_be_referred to lead_statuses...');
    
    await client.query('BEGIN');
    
    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, 'database', 'add_can_be_referred_to_lead_statuses.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration SQL...');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'lead_statuses' 
      AND column_name = 'can_be_referred'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification: can_be_referred column exists');
      console.log('   Column details:', verifyResult.rows[0]);
    } else {
      console.log('⚠️  Warning: Column not found after migration');
    }
    
    // Show current values
    const statusesResult = await client.query(`
      SELECT id, status_name, can_be_referred 
      FROM lead_statuses 
      ORDER BY id
    `);
    
    console.log('\n📊 Current lead statuses and their can_be_referred values:');
    statusesResult.rows.forEach(status => {
      console.log(`   - ${status.status_name} (ID: ${status.id}): can_be_referred = ${status.can_be_referred}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });

