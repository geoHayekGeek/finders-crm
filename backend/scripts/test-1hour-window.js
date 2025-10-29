// Test 1-hour reminder window logic
const pool = require('../config/db');

async function test1HourWindow() {
  try {
    console.log('🔍 Testing 1-hour reminder window logic...\n');

    // Get event 84
    const eventResult = await pool.query(
      `SELECT id, title, start_time FROM calendar_events WHERE id = 84`
    );

    const event = eventResult.rows[0];
    console.log('📅 Event 84:');
    console.log(`   Start time: ${event.start_time}\n`);

    // Get current time and calculate windows
    const timeResult = await pool.query(`
      SELECT 
        NOW() as current_time,
        NOW() + INTERVAL '55 minutes' as window_start,
        NOW() + INTERVAL '65 minutes' as window_end,
        $1::timestamp as event_time,
        $1::timestamp > NOW() + INTERVAL '55 minutes' as event_after_window_start,
        $1::timestamp <= NOW() + INTERVAL '65 minutes' as event_before_window_end,
        ($1::timestamp > NOW() + INTERVAL '55 minutes' 
         AND $1::timestamp <= NOW() + INTERVAL '65 minutes') as in_window,
        EXTRACT(EPOCH FROM ($1::timestamp - NOW())) / 60 as minutes_until_event
    `, [event.start_time]);

    const time = timeResult.rows[0];
    console.log('⏰ Time Window Check:');
    console.log(`   Current time: ${time.current_time}`);
    console.log(`   Window start (NOW + 55 min): ${time.window_start}`);
    console.log(`   Window end (NOW + 65 min): ${time.window_end}`);
    console.log(`   Event time: ${time.event_time}`);
    console.log(`   Minutes until event: ${Math.round(time.minutes_until_event)}`);
    console.log(`\n   Event > window start: ${time.event_after_window_start}`);
    console.log(`   Event <= window end: ${time.event_before_window_end}`);
    console.log(`   ✅ In window: ${time.in_window}\n`);

    // Check if reminder tracking would exclude it
    const trackingResult = await pool.query(
      `SELECT 
        reminder_type,
        email_sent,
        notification_sent,
        (email_sent = true OR notification_sent = true) as already_sent
       FROM reminder_tracking 
       WHERE event_id = 84 AND reminder_type = '1_hour'`
    );

    if (trackingResult.rows.length > 0) {
      const tracking = trackingResult.rows[0];
      console.log('📋 Reminder Tracking:');
      console.log(`   Email sent: ${tracking.email_sent}`);
      console.log(`   Notification sent: ${tracking.notification_sent}`);
      console.log(`   Already sent (would be excluded): ${tracking.already_sent}\n`);
    }

    // Now run the actual query that finds reminders
    const reminderQuery = `
      WITH upcoming_events AS (
        SELECT 
          ce.id as event_id,
          ce.title as event_title,
          ce.start_time as event_start_time,
          ce.created_by,
          ce.assigned_to,
          ce.attendees
        FROM calendar_events ce
        WHERE ce.start_time > NOW()
          AND ce.start_time <= NOW() + INTERVAL '2 days'
          AND ce.id = 84
      ),
      event_users AS (
        SELECT DISTINCT 
          ue.event_id,
          ue.event_start_time,
          u.id as user_id
        FROM upcoming_events ue
        JOIN users u ON u.id = ue.created_by
      ),
      reminder_schedules AS (
        SELECT 
          eu.*,
          '1_hour' as reminder_type,
          eu.event_start_time - INTERVAL '1 hour' as scheduled_time
        FROM event_users eu
        WHERE eu.event_start_time > NOW() + INTERVAL '55 minutes'
          AND eu.event_start_time <= NOW() + INTERVAL '65 minutes'
      )
      SELECT 
        rs.event_id,
        rs.user_id,
        rs.reminder_type,
        rs.scheduled_time,
        EXISTS (
          SELECT 1 FROM reminder_tracking rt 
          WHERE rt.event_id = rs.event_id 
            AND rt.user_id = rs.user_id 
            AND rt.reminder_type = rs.reminder_type
            AND (rt.email_sent = true OR rt.notification_sent = true)
        ) as already_sent
      FROM reminder_schedules rs
    `;

    const queryResult = await pool.query(reminderQuery);
    
    console.log('🔍 Query Result:');
    if (queryResult.rows.length === 0) {
      console.log('   ❌ No reminders found by the query');
      console.log('\n   This means one of these conditions failed:');
      console.log('   1. Event not in upcoming_events (start_time > NOW() AND <= NOW() + 2 days)');
      console.log('   2. No users found for the event');
      console.log('   3. Event not in 55-65 minute window');
      console.log('   4. Already sent (tracking record exists with sent=true)');
    } else {
      console.log(`   ✅ Found ${queryResult.rows.length} reminder(s):`);
      queryResult.rows.forEach(row => {
        console.log(`      Event ${row.event_id}, User ${row.user_id}`);
        console.log(`      Type: ${row.reminder_type}`);
        console.log(`      Scheduled: ${row.scheduled_time}`);
        console.log(`      Already sent: ${row.already_sent}`);
        console.log(`      Would be sent: ${!row.already_sent}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

test1HourWindow();

