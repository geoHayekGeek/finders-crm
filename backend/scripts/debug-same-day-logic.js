// Debug script to check same_day reminder logic
const pool = require('../config/db');

async function debugSameDayLogic() {
  try {
    console.log('🔍 Debugging same_day reminder logic...\n');

    // Get event 84
    const eventResult = await pool.query(
      `SELECT id, title, start_time, DATE(start_time) as start_date
       FROM calendar_events 
       WHERE id = 84`
    );

    const event = eventResult.rows[0];
    console.log('📅 Event 84:');
    console.log(`   Start time: ${event.start_time}`);
    console.log(`   Start date: ${event.start_date}\n`);

    // Check database date/time
    const dbResult = await pool.query(`
      SELECT 
        NOW() as current_timestamp,
        CURRENT_DATE as current_date,
        DATE($1::timestamp) as event_date,
        DATE($1::timestamp) = CURRENT_DATE as dates_match
    `, [event.start_time]);

    console.log('🕐 Database time info:');
    console.log(`   NOW(): ${dbResult.rows[0].current_timestamp}`);
    console.log(`   CURRENT_DATE: ${dbResult.rows[0].current_date}`);
    console.log(`   Event DATE: ${dbResult.rows[0].event_date}`);
    console.log(`   Dates match: ${dbResult.rows[0].dates_match}\n`);

    // Test the same_day reminder condition
    const testQuery = `
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        DATE(ce.start_time) as event_date,
        CURRENT_DATE as today,
        DATE(ce.start_time) = CURRENT_DATE as is_same_day,
        ce.start_time > NOW() as is_future,
        DATE(ce.start_time) as scheduled_time
      FROM calendar_events ce
      WHERE ce.id = 84
    `;

    const testResult = await pool.query(testQuery);
    console.log('🧪 Same day condition test:');
    console.log(`   Event date: ${testResult.rows[0].event_date}`);
    console.log(`   Today: ${testResult.rows[0].today}`);
    console.log(`   Is same day: ${testResult.rows[0].is_same_day}`);
    console.log(`   Is future: ${testResult.rows[0].is_future}`);
    console.log(`   Scheduled time (using DATE()): ${testResult.rows[0].scheduled_time}\n`);

    // The problem: scheduled_time for same_day uses DATE(event_start_time)
    // which returns just the date, but then it's compared as a timestamp
    console.log('⚠️  PROBLEM IDENTIFIED:');
    console.log('   The same_day reminder uses DATE(eu.event_start_time) as scheduled_time');
    console.log('   DATE() returns just the date part (midnight)');
    console.log('   So for an event at Oct 30 00:19, the scheduled_time becomes Oct 30 00:00');
    console.log('   But the reminder should be scheduled for 9 AM on Oct 30!');
    console.log('');
    console.log('   Additionally, the time window check is:');
    console.log('   WHERE DATE(eu.event_start_time) = CURRENT_DATE');
    console.log('   This means it only triggers on the CURRENT day, not the event day.');
    console.log('   For an event at 00:19 on Oct 30, when it\'s still Oct 29, it won\'t match!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugSameDayLogic();

