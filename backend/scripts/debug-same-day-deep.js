// Deep debugging of same_day reminder logic
const pool = require('../config/db');

async function debugSameDayDeep() {
  try {
    console.log('🔍 Deep debugging same_day reminder logic...\n');

    // Get event 84
    const eventResult = await pool.query(
      `SELECT id, title, start_time FROM calendar_events WHERE id = 84`
    );

    const event = eventResult.rows[0];
    const eventTime = new Date(event.start_time);
    
    console.log('📅 Event 84:');
    console.log(`   Start time: ${event.start_time}`);
    console.log(`   Event hour: ${eventTime.getHours()}:${eventTime.getMinutes()}\n`);

    // Check current time and date logic
    const timeResult = await pool.query(`
      SELECT 
        NOW() as current_time,
        CURRENT_DATE as current_date,
        DATE($1::timestamp) as event_date,
        DATE($1::timestamp) = CURRENT_DATE as dates_match,
        $1::timestamp as event_timestamp,
        $1::timestamp > NOW() as event_is_future
    `, [event.start_time]);

    const time = timeResult.rows[0];
    console.log('⏰ Date Logic:');
    console.log(`   Current time: ${time.current_time}`);
    console.log(`   Current date: ${time.current_date}`);
    console.log(`   Event date: ${time.event_date}`);
    console.log(`   Dates match: ${time.dates_match}`);
    console.log(`   Event is future: ${time.event_is_future}\n`);

    // The PROBLEM: The query uses DATE(event_start_time) = CURRENT_DATE
    // For an event at 00:19 on Oct 30, when it's still Oct 29, this is FALSE
    // So the reminder won't trigger!

    console.log('❌ PROBLEM #1:');
    console.log('   The query checks: DATE(event_start_time) = CURRENT_DATE');
    console.log(`   For event at ${eventTime.toISOString()}`);
    console.log(`   Event date is ${time.event_date}`);
    console.log(`   But current date is ${time.current_date}`);
    console.log(`   So dates_match = ${time.dates_match} ❌\n`);

    // Check what the scheduled_time becomes
    const scheduledResult = await pool.query(`
      SELECT 
        DATE($1::timestamp) as scheduled_time,
        EXTRACT(HOUR FROM $1::timestamp) as event_hour,
        EXTRACT(MINUTE FROM $1::timestamp) as event_minute
    `, [event.start_time]);

    console.log('❌ PROBLEM #2:');
    console.log(`   The scheduled_time uses DATE(event_start_time)`);
    console.log(`   This returns: ${scheduledResult.rows[0].scheduled_time}`);
    console.log(`   Hour: ${scheduledResult.rows[0].scheduled_hour}, Minute: ${scheduledResult.rows[0].scheduled_minute}`);
    console.log('   DATE() returns midnight (00:00:00), NOT 9 AM!\n');

    // Show what the correct logic should be
    const correctResult = await pool.query(`
      SELECT 
        $1::timestamp as event_time,
        DATE($1::timestamp) + INTERVAL '9 hours' as correct_scheduled_time,
        NOW() as now,
        DATE($1::timestamp) + INTERVAL '9 hours' as reminder_time,
        DATE($1::timestamp) + INTERVAL '9 hours' > NOW() as reminder_is_future,
        DATE($1::timestamp) + INTERVAL '9 hours' <= NOW() + INTERVAL '24 hours' as within_24_hours,
        EXTRACT(EPOCH FROM (DATE($1::timestamp) + INTERVAL '9 hours' - NOW())) / 3600 as hours_until_reminder
    `, [event.start_time]);

    const correct = correctResult.rows[0];
    console.log('✅ CORRECT LOGIC:');
    console.log(`   Event time: ${correct.event_time}`);
    console.log(`   Scheduled for 9 AM: ${correct.correct_scheduled_time}`);
    console.log(`   Current time: ${correct.now}`);
    console.log(`   Reminder is future: ${correct.reminder_is_future}`);
    console.log(`   Within 24 hours: ${correct.within_24_hours}`);
    console.log(`   Hours until reminder: ${parseFloat(correct.hours_until_reminder).toFixed(2)}\n`);

    // Check the actual query
    console.log('🔍 Testing actual same_day query:\n');
    
    const actualQuery = `
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
          u.id as user_id
        FROM upcoming_events ue
        JOIN users u ON u.id = ue.created_by
      ),
      reminder_schedules AS (
        SELECT 
          eu.*,
          'same_day' as reminder_type,
          DATE(eu.event_start_time) as scheduled_time,
          DATE(eu.event_start_time) = CURRENT_DATE as matches_current_logic,
          eu.event_start_time > NOW() as event_is_future
        FROM event_users eu
      )
      SELECT 
        rs.*,
        DATE(rs.event_start_time) = CURRENT_DATE AND rs.event_start_time > NOW() as would_trigger
      FROM reminder_schedules rs
    `;

    const actualResult = await pool.query(actualQuery);
    
    if (actualResult.rows.length === 0) {
      console.log('   ❌ No results from query\n');
    } else {
      const row = actualResult.rows[0];
      console.log('   Current Logic Results:');
      console.log(`   Event ${row.event_id}, User ${row.user_id}`);
      console.log(`   Scheduled time: ${row.scheduled_time}`);
      console.log(`   Matches CURRENT_DATE: ${row.matches_current_logic}`);
      console.log(`   Event is future: ${row.event_is_future}`);
      console.log(`   Would trigger: ${row.would_trigger} ❌\n`);
    }

    console.log('💡 SOLUTION:');
    console.log('   Change scheduled_time to: DATE(event_start_time) + INTERVAL \'9 hours\'');
    console.log('   Change trigger condition to: (scheduled_time >= NOW() AND scheduled_time <= NOW() + INTERVAL \'1 hour\')');
    console.log('   This will trigger the reminder around 9 AM on the event day,');
    console.log('   regardless of when the actual event time is.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugSameDayDeep();

