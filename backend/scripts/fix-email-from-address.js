// Script to fix email_from_address to match Gmail SMTP user
const pool = require('../config/db');

async function fixEmailFromAddress() {
  try {
    console.log('🔧 Fixing email_from_address to match SMTP user...\n');
    
    // Get SMTP user
    const smtpUserResult = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'smtp_user'`
    );
    
    if (smtpUserResult.rows.length === 0) {
      console.log('❌ SMTP user not found in settings');
      return;
    }
    
    const smtpUser = smtpUserResult.rows[0].setting_value;
    console.log(`SMTP User: ${smtpUser}`);
    
    // Update email_from_address to match
    await pool.query(
      `UPDATE system_settings 
       SET setting_value = $1, updated_at = NOW() 
       WHERE setting_key = 'email_from_address'`,
      [smtpUser]
    );
    
    console.log(`✅ Updated email_from_address to: ${smtpUser}`);
    console.log('\n💡 This ensures Gmail will accept emails from this address.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixEmailFromAddress();

