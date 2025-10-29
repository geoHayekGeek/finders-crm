// Reschedule event 84 to trigger reminder update with new logic
const pool = require('../config/db');
const ReminderService = require('../services/reminderService');

async function rescheduleEvent84() {
  try {
    console.log('🔄 Rescheduling event 84...\n');

    // Get current event
    const eventResult = await pool.query(
      `SELECT * FROM calendar_events WHERE id = 84`
    );

    if (eventResult.rows.length === 0) {
      console.log('❌ Event 84 not found');
      return;
    }

    const event = eventResult.rows[0];
    console.log('📅 Current Event:');
    console.log(`   Start: ${event.start_time}`);
    console.log(`   End: ${event.end_time}\n`);

    // Move event by 1 minute to trigger update
    const newStartTime = new Date(event.start_time);
    newStartTime.setMinutes(newStartTime.getMinutes() + 1);
    
    const newEndTime = new Date(event.end_time);
    newEndTime.setMinutes(newEndTime.getMinutes() + 1);

    console.log('📅 New Event Times:');
    console.log(`   Start: ${newStartTime}`);
    console.log(`   End: ${newEndTime}\n`);

    // Update event
    await pool.query(
      `UPDATE calendar_events 
       SET start_time = $1, end_time = $2, updated_at = NOW()
       WHERE id = 84`,
      [newStartTime, newEndTime]
    );

    console.log('✅ Event updated in database\n');

    // Reschedule reminders with new logic
    console.log('🔔 Rescheduling reminders with NEW logic...\n');
    await ReminderService.scheduleEventReminders(84);

    // Show new tracking
    const trackingResult = await pool.query(
      `SELECT * FROM reminder_tracking 
       WHERE event_id = 84 
       ORDER BY reminder_type`
    );

    console.log('📋 Updated Reminder Tracking:\n');
    trackingResult.rows.forEach(row => {
      console.log(`   ${row.reminder_type}:`);
      console.log(`      Scheduled: ${row.scheduled_time}`);
      console.log(`      Email sent: ${row.email_sent}`);
      console.log(`      Notification sent: ${row.notification_sent}`);
      console.log(`      Sent at: ${row.sent_at || 'Not sent yet'}\n`);
    });

    console.log('✅ Done! Event rescheduled and reminders updated.');
    console.log('   The system will now send reminders based on the NEW logic.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

rescheduleEvent84();

