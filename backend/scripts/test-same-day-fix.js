// Test the same_day reminder fix
const pool = require('../config/db');

async function testSameDayFix() {
  try {
    console.log('🧪 Testing same_day reminder fix...\n');

    // Get event 84
    const eventResult = await pool.query(
      `SELECT id, title, start_time FROM calendar_events WHERE id = 84`
    );

    const event = eventResult.rows[0];
    const eventTime = new Date(event.start_time);
    
    console.log('📅 Event 84:');
    console.log(`   Start time: ${event.start_time}`);
    console.log(`   Event hour: ${eventTime.getHours()}:${String(eventTime.getMinutes()).padStart(2, '0')}\n`);

    // Calculate what 9 AM on event day would be
    const nineAM = new Date(eventTime);
    nineAM.setHours(9, 0, 0, 0);
    
    console.log('⏰ Same-Day Reminder Logic:');
    console.log(`   9 AM on event day: ${nineAM}`);
    console.log(`   Event time: ${eventTime}`);
    console.log(`   Is 9 AM before event: ${nineAM < eventTime}`);
    
    if (nineAM >= eventTime) {
      console.log(`\n   ⚠️  Event is at ${eventTime.getHours()}:${String(eventTime.getMinutes()).padStart(2, '0')}, which is BEFORE 9 AM!`);
      console.log('   Same-day reminders are designed for 9 AM on the event day.');
      console.log('   For events before 9 AM, same-day reminder should NOT be sent.\n');
      console.log('   ✅ This is correct behavior - no same_day reminder for this event.\n');
    } else {
      console.log('   ✅ 9 AM is before event, same_day reminder should be scheduled.\n');
    }

    // Test the new query
    console.log('🔍 Testing NEW same_day query logic:\n');
    
    const newQuery = `
      WITH upcoming_events AS (
        SELECT 
          ce.id as event_id,
          ce.start_time as event_start_time,
          ce.created_by
        FROM calendar_events ce
        WHERE ce.start_time > NOW()
          AND ce.start_time <= NOW() + INTERVAL '2 days'
          AND ce.id = 84
      ),
      event_users AS (
        SELECT DISTINCT 
          ue.event_id,
          ue.event_start_time,
          u.id as user_id,
          u.name as user_name
        FROM upcoming_events ue
        JOIN users u ON u.id = ue.created_by
      ),
      reminder_schedules AS (
        SELECT 
          eu.*,
          'same_day' as reminder_type,
          (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp as scheduled_time,
          (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp >= NOW() - INTERVAL '30 minutes' as after_window_start,
          (DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp <= NOW() + INTERVAL '30 minutes' as before_window_end,
          eu.event_start_time > NOW() as event_is_future,
          EXTRACT(EPOCH FROM ((DATE(eu.event_start_time) + INTERVAL '9 hours')::timestamp - NOW())) / 60 as minutes_until_9am
        FROM event_users eu
      )
      SELECT 
        rs.*,
        (rs.after_window_start AND rs.before_window_end AND rs.event_is_future) as would_trigger_now
      FROM reminder_schedules rs
    `;

    const queryResult = await pool.query(newQuery);
    
    if (queryResult.rows.length === 0) {
      console.log('   ℹ️  No same_day reminder scheduled (correct for events before 9 AM)\n');
    } else {
      const row = queryResult.rows[0];
      console.log('   Results with NEW logic:');
      console.log(`   Event ${row.event_id}, User ${row.user_id} (${row.user_name})`);
      console.log(`   Scheduled for: ${row.scheduled_time}`);
      console.log(`   Minutes until 9 AM: ${Math.round(row.minutes_until_9am)}`);
      console.log(`   After window start (-30 min): ${row.after_window_start}`);
      console.log(`   Before window end (+30 min): ${row.before_window_end}`);
      console.log(`   Event is future: ${row.event_is_future}`);
      console.log(`   ✅ Would trigger NOW: ${row.would_trigger_now}\n`);

      // Check tracking
      const trackingResult = await pool.query(
        `SELECT * FROM reminder_tracking WHERE event_id = 84 AND reminder_type = 'same_day'`
      );

      if (trackingResult.rows.length > 0) {
        const track = trackingResult.rows[0];
        console.log('   📋 Tracking Status:');
        console.log(`   Scheduled: ${track.scheduled_time}`);
        console.log(`   Email sent: ${track.email_sent}`);
        console.log(`   Notification sent: ${track.notification_sent}`);
        console.log(`   Already sent: ${track.email_sent || track.notification_sent}\n`);
      }
    }

    console.log('💡 RECOMMENDATION:');
    console.log('   For events scheduled before 9 AM (like 00:38), consider:');
    console.log('   1. Not sending same_day reminder (current behavior)');
    console.log('   2. OR sending it the evening before (e.g., 6 PM previous day)');
    console.log('   3. OR only relying on 1-hour reminder for early morning events\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testSameDayFix();

