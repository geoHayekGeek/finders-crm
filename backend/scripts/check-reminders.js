// Quick script to check reminder status
const pool = require('../config/db');

async function checkReminders() {
  try {
    console.log('🔍 Checking reminder status...\n');
    
    // Get current time
    const now = new Date();
    console.log(`⏰ Current time: ${now.toLocaleString()}\n`);
    
    // Check upcoming events
    console.log('📅 Upcoming Events (next 2 days):');
    const eventsResult = await pool.query(`
      SELECT 
        id, 
        title, 
        start_time,
        start_time - NOW() as time_until_event,
        created_by
      FROM calendar_events 
      WHERE start_time > NOW() 
      AND start_time <= NOW() + INTERVAL '2 days'
      ORDER BY start_time
    `);
    
    if (eventsResult.rows.length > 0) {
      console.table(eventsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        start_time: row.start_time.toLocaleString(),
        minutes_until: Math.floor(row.time_until_event.minutes || 0),
        created_by: row.created_by
      })));
    } else {
      console.log('  No upcoming events found.\n');
    }
    
    // Check reminder tracking
    console.log('\n📊 Reminder Tracking Records (recent):');
    const trackingResult = await pool.query(`
      SELECT 
        rt.id,
        rt.event_id,
        rt.reminder_type,
        rt.email_sent,
        rt.notification_sent,
        rt.scheduled_time,
        ce.start_time as event_start,
        ce.title as event_title
      FROM reminder_tracking rt
      JOIN calendar_events ce ON ce.id = rt.event_id
      WHERE ce.start_time > NOW() - INTERVAL '1 day'
      ORDER BY rt.created_at DESC
      LIMIT 10
    `);
    
    if (trackingResult.rows.length > 0) {
      console.table(trackingResult.rows.map(row => ({
        id: row.id,
        event_id: row.event_id,
        event_title: row.event_title,
        type: row.reminder_type,
        email_sent: row.email_sent,
        notif_sent: row.notification_sent,
        scheduled: row.scheduled_time.toLocaleString(),
        event_start: row.event_start.toLocaleString()
      })));
    } else {
      console.log('  No tracking records found.\n');
    }
    
    // Check what reminders SHOULD be sent now
    console.log('\n🎯 Events That Should Trigger Reminders Now:');
    
    // 1 hour reminders (55-65 minutes from now)
    const oneHourResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        (ce.start_time - NOW()) as time_until
      FROM calendar_events ce
      WHERE ce.start_time > NOW() + INTERVAL '55 minutes'
        AND ce.start_time <= NOW() + INTERVAL '65 minutes'
    `);
    
    console.log('\n1-Hour Reminders (events starting in 55-65 minutes):');
    if (oneHourResult.rows.length > 0) {
      console.table(oneHourResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        start_time: row.start_time.toLocaleString(),
        minutes_until: Math.floor((row.start_time - now) / 60000)
      })));
    } else {
      console.log('  None');
    }
    
    // Same day reminders
    const sameDayResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time
      FROM calendar_events ce
      WHERE DATE(ce.start_time) = CURRENT_DATE
        AND ce.start_time > NOW()
    `);
    
    console.log('\nSame Day Reminders (events today):');
    if (sameDayResult.rows.length > 0) {
      console.table(sameDayResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        start_time: row.start_time.toLocaleString()
      })));
    } else {
      console.log('  None');
    }
    
    // Check for blocking tracking records
    console.log('\n🚫 Blocking Tracking Records (already sent):');
    const blockingResult = await pool.query(`
      SELECT 
        rt.event_id,
        rt.reminder_type,
        rt.email_sent,
        rt.notification_sent,
        ce.title,
        ce.start_time
      FROM reminder_tracking rt
      JOIN calendar_events ce ON ce.id = rt.event_id
      WHERE ce.start_time > NOW()
        AND (rt.email_sent = true OR rt.notification_sent = true)
      ORDER BY ce.start_time
    `);
    
    if (blockingResult.rows.length > 0) {
      console.table(blockingResult.rows);
    } else {
      console.log('  None (good!)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkReminders();


