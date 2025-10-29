// Check if event 84 was rescheduled
const pool = require('../config/db');

async function checkEventReschedule() {
  try {
    console.log('🔍 Checking event 84 reschedule history...\n');

    // Get event details
    const eventResult = await pool.query(
      `SELECT id, title, start_time, end_time, created_at, updated_at
       FROM calendar_events 
       WHERE id = 84`
    );

    const event = eventResult.rows[0];
    console.log('📅 Event 84:');
    console.log(`   Title: ${event.title}`);
    console.log(`   Start: ${event.start_time}`);
    console.log(`   Created: ${event.created_at}`);
    console.log(`   Updated: ${event.updated_at}\n`);

    // Get all reminder tracking records
    const trackingResult = await pool.query(
      `SELECT * FROM reminder_tracking 
       WHERE event_id = 84 
       ORDER BY created_at`
    );

    console.log(`📋 Reminder tracking history (${trackingResult.rows.length} records):\n`);
    
    trackingResult.rows.forEach(record => {
      console.log(`${record.reminder_type} reminder:`);
      console.log(`  Created: ${record.created_at}`);
      console.log(`  Updated: ${record.updated_at}`);
      console.log(`  Scheduled for: ${record.scheduled_time}`);
      console.log(`  Sent at: ${record.sent_at || 'Not sent'}`);
      console.log(`  Status: Email=${record.email_sent}, Notification=${record.notification_sent}\n`);
    });

    // Calculate expected reminder times based on current event time
    const eventStart = new Date(event.start_time);
    const oneDayBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    const oneHourBefore = new Date(eventStart.getTime() - 60 * 60 * 1000);
    
    console.log('⏰ Expected reminder times (based on current event time):');
    console.log(`  1_day before: ${oneDayBefore}`);
    console.log(`  1_hour before: ${oneHourBefore}`);
    console.log(`  same_day (9 AM): ${new Date(eventStart).setHours(9, 0, 0, 0)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkEventReschedule();

