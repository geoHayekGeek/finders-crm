// Complete test of same_day reminder fix
const pool = require('../config/db');

async function testSameDayComplete() {
  try {
    console.log('🧪 Complete test of same_day reminder fix\n');
    console.log('='
.repeat(60) + '\n');

    // Get event 84
    const eventResult = await pool.query(
      `SELECT id, title, start_time FROM calendar_events WHERE id = 84`
    );

    const event = eventResult.rows[0];
    const eventTime = new Date(event.start_time);
    const eventHour = eventTime.getHours();
    
    console.log('📅 Event Details:');
    console.log(`   ID: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Start time: ${event.start_time}`);
    console.log(`   Hour: ${eventHour}:${String(eventTime.getMinutes()).padStart(2, '0')}\n`);

    // Calculate reminder time based on new logic
    const reminderTime = new Date(eventTime);
    if (eventHour >= 9) {
      reminderTime.setHours(9, 0, 0, 0);
      console.log('✅ Event is AFTER 9 AM');
      console.log(`   Reminder should be: 9 AM same day\n`);
    } else {
      reminderTime.setDate(reminderTime.getDate() - 1);
      reminderTime.setHours(20, 0, 0, 0);
      console.log('✅ Event is BEFORE 9 AM');
      console.log(`   Reminder should be: 8 PM previous evening\n`);
    }

    console.log('⏰ Calculated Reminder Time:');
    console.log(`   ${reminderTime}`);
    console.log(`   Is before event: ${reminderTime < eventTime}`);
    console.log(`   Is in future: ${reminderTime > new Date()}\n`);

    // Test with SQL CASE logic
    const sqlTest = await pool.query(`
      SELECT 
        $1::timestamp as event_time,
        EXTRACT(HOUR FROM $1::timestamp) as event_hour,
        CASE 
          WHEN EXTRACT(HOUR FROM $1::timestamp) >= 9 
          THEN (DATE($1::timestamp) + INTERVAL '9 hours')::timestamp
          ELSE (DATE($1::timestamp) - INTERVAL '4 hours')::timestamp
        END as scheduled_time
    `, [event.start_time]);

    const sqlResult = sqlTest.rows[0];
    console.log('🔍 SQL CASE Logic Result:');
    console.log(`   Event hour: ${sqlResult.event_hour}`);
    console.log(`   Scheduled time: ${sqlResult.scheduled_time}\n`);

    // Check if reminder would trigger now
    const triggerTest = await pool.query(`
      SELECT 
        $1::timestamp as reminder_time,
        NOW() as current_time,
        $1::timestamp >= NOW() - INTERVAL '30 minutes' as after_start,
        $1::timestamp <= NOW() + INTERVAL '30 minutes' as before_end,
        ($1::timestamp >= NOW() - INTERVAL '30 minutes' 
         AND $1::timestamp <= NOW() + INTERVAL '30 minutes') as in_window,
        EXTRACT(EPOCH FROM ($1::timestamp - NOW())) / 60 as minutes_until_reminder
    `, [sqlResult.scheduled_time]);

    const trigger = triggerTest.rows[0];
    console.log('🎯 Trigger Window Check:');
    console.log(`   Current time: ${trigger.current_time}`);
    console.log(`   Reminder time: ${trigger.reminder_time}`);
    console.log(`   Minutes until reminder: ${Math.round(trigger.minutes_until_reminder)}`);
    console.log(`   After window start: ${trigger.after_start}`);
    console.log(`   Before window end: ${trigger.before_end}`);
    console.log(`   ✅ In trigger window: ${trigger.in_window}\n`);

    // Check current tracking
    const trackingResult = await pool.query(
      `SELECT * FROM reminder_tracking WHERE event_id = 84 AND reminder_type = 'same_day'`
    );

    if (trackingResult.rows.length > 0) {
      const track = trackingResult.rows[0];
      console.log('📋 Current Tracking Record:');
      console.log(`   Scheduled: ${track.scheduled_time}`);
      console.log(`   Email sent: ${track.email_sent}`);
      console.log(`   Notification sent: ${track.notification_sent}`);
      console.log(`   Sent at: ${track.sent_at || 'Not sent yet'}\n`);

      if (track.scheduled_time.getTime() !== new Date(sqlResult.scheduled_time).getTime()) {
        console.log('⚠️  WARNING: Tracking scheduled_time does not match calculated time!');
        console.log(`   Expected: ${sqlResult.scheduled_time}`);
        console.log(`   Actual: ${track.scheduled_time}`);
        console.log('   → Event needs to be rescheduled to update tracking\n');
      }
    } else {
      console.log('📋 No tracking record found for same_day reminder\n');
    }

    console.log('='
.repeat(60));
    console.log('\n💡 SUMMARY:\n');
    
    if (eventHour >= 9) {
      console.log('   ✅ Event is after 9 AM → Reminder at 9 AM same day');
    } else {
      console.log('   ✅ Event is before 9 AM → Reminder at 8 PM evening before');
    }
    
    if (trigger.in_window) {
      console.log('   ✅ Currently IN trigger window - reminder should send NOW!');
      if (trackingResult.rows.length > 0 && (trackingResult.rows[0].email_sent || trackingResult.rows[0].notification_sent)) {
        console.log('   ⚠️  But reminder already sent - reset tracking to test again');
      }
    } else {
      console.log(`   ⏳ Reminder will trigger in ${Math.round(trigger.minutes_until_reminder)} minutes`);
    }
    
    console.log('\n📝 TO APPLY THE FIX:');
    console.log('   1. RESTART the backend server');
    console.log('   2. Reschedule event 84 (or create new event) to update tracking');
    console.log('   3. Wait for reminder window or manually trigger');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testSameDayComplete();

