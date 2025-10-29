// Script to run email configuration migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'finders_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'add_smtp_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('⚡ Running migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Verifying settings...');
    
    const result = await client.query(
      `SELECT setting_key, setting_value, category 
       FROM system_settings 
       WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'email_from_name', 'email_from_address')
       ORDER BY setting_key`
    );
    
    console.log('\n✅ Email configuration settings:');
    result.rows.forEach(row => {
      // Mask password
      const value = row.setting_key === 'smtp_pass' 
        ? '••••••••••••••••' 
        : row.setting_value;
      console.log(`   ${row.setting_key}: ${value}`);
    });
    
    console.log('\n🎉 Email configuration migration completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to Settings → Email Configuration in the UI');
    console.log('   2. Verify your SMTP settings');
    console.log('   3. Click "Test Email Connection" to verify it works');
    console.log('   4. Update settings if needed and save');
    console.log('   5. Optionally remove EMAIL_* variables from .env file');
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

