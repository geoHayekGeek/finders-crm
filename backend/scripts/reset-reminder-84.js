// Script to reset the 1-hour reminder for event 84 so it can send
const pool = require('../config/db');

async function resetReminder84() {
  try {
    console.log('🔧 Resetting 1-Hour Reminder for Event 84\n');
    
    // Reset the tracking record
    const result = await pool.query(`
      UPDATE reminder_tracking
      SET email_sent = false,
          notification_sent = false,
          updated_at = NOW()
      WHERE event_id = 84
        AND reminder_type = '1_hour'
      RETURNING id, event_id, reminder_type, email_sent, notification_sent
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Reminder tracking record reset!');
      console.log(`   Event ID: ${result.rows[0].event_id}`);
      console.log(`   Reminder Type: ${result.rows[0].reminder_type}`);
      console.log(`   Email Sent: ${result.rows[0].email_sent ? '✅' : '❌'}`);
      console.log(`   Notification Sent: ${result.rows[0].notification_sent ? '✅' : '❌'}`);
      console.log('\n💡 The reminder service should now pick up this event on the next run.');
      console.log('   Run the reminder service to send the email now:\n');
      console.log('   node scripts/reminderManager.js run\n');
    } else {
      console.log('⚠️ No tracking record found for event 84, 1_hour reminder');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetReminder84();

