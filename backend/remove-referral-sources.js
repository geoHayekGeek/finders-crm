const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function removeReferralSources() {
  try {
    console.log('🗑️ Starting removal of referral source fields...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'remove_referral_sources.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Referral source fields removed successfully!');
    console.log('📊 Referral source columns have been dropped from leads and properties tables');
    console.log('✅ Reference source (Facebook, Instagram, etc.) columns remain intact');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing referral source fields:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
removeReferralSources();
