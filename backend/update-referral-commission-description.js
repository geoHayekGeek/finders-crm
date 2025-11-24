// update-referral-commission-description.js
const pool = require('./config/db');
require('dotenv').config();

async function updateDescription() {
  try {
    await pool.query(`
      UPDATE system_settings 
      SET description = 'External referral commission percentage for custom/non-employee referrals' 
      WHERE setting_key = 'commission_referral_extended_percentage'
    `);
    console.log('✅ Updated setting description');
    await pool.end();
  } catch (error) {
    console.error('❌ Error updating description:', error);
    process.exit(1);
  }
}

updateDescription();

