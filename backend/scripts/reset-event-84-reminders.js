// Reset reminder tracking for event 84 so reminders can be sent again
const pool = require('../config/db');

async function resetEvent84Reminders() {
  try {
    console.log('🔄 Resetting reminder tracking for event 84...\n');

    // Show current state
    const beforeResult = await pool.query(
      `SELECT reminder_type, scheduled_time, email_sent, notification_sent, sent_at
       FROM reminder_tracking 
       WHERE event_id = 84 
       ORDER BY reminder_type`
    );

    console.log('📋 Current state:');
    beforeResult.rows.forEach(row => {
      console.log(`  ${row.reminder_type}:`);
      console.log(`    Scheduled: ${row.scheduled_time}`);
      console.log(`    Sent: Email=${row.email_sent}, Notification=${row.notification_sent}`);
      console.log(`    Sent at: ${row.sent_at || 'Not sent'}\n`);
    });

    // Reset the flags
    const result = await pool.query(
      `UPDATE reminder_tracking 
       SET email_sent = false, 
           notification_sent = false, 
           sent_at = NULL
       WHERE event_id = 84
       RETURNING *`
    );

    console.log(`✅ Reset ${result.rowCount} reminder tracking records\n`);

    // Show new state
    console.log('📋 New state:');
    result.rows.forEach(row => {
      console.log(`  ${row.reminder_type}:`);
      console.log(`    Scheduled: ${row.scheduled_time}`);
      console.log(`    Sent: Email=${row.email_sent}, Notification=${row.notification_sent}`);
      console.log(`    Sent at: ${row.sent_at || 'Not sent'}\n`);
    });

    console.log('✅ Done! Reminders will be sent again at their scheduled times.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetEvent84Reminders();

