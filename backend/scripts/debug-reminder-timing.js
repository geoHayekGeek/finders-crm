// Debug script to check reminder timing for event 84
const pool = require('../config/db');

async function debugReminderTiming() {
  try {
    console.log('🔍 Debugging reminder timing for event 84...\n');

    // Get current time
    const now = new Date();
    console.log(`⏰ Current time: ${now}`);
    console.log(`⏰ Current time (ISO): ${now.toISOString()}\n`);

    // Get event 84 details
    const eventResult = await pool.query(
      `SELECT id, title, start_time, end_time 
       FROM calendar_events 
       WHERE id = 84`
    );

    if (eventResult.rows.length === 0) {
      console.log('❌ Event 84 not found');
      return;
    }

    const event = eventResult.rows[0];
    console.log('📅 Event 84 Details:');
    console.log(`   Title: ${event.title}`);
    console.log(`   Start: ${event.start_time}`);
    console.log(`   End: ${event.end_time}\n`);

    // Calculate time differences
    const eventStartTime = new Date(event.start_time);
    const timeDiff = eventStartTime - now;
    const minutesDiff = Math.floor(timeDiff / 1000 / 60);
    const hoursDiff = (timeDiff / 1000 / 60 / 60).toFixed(2);

    console.log('⏱️  Time Calculations:');
    console.log(`   Time until event: ${minutesDiff} minutes (${hoursDiff} hours)`);
    console.log(`   Is event > NOW + 55 minutes? ${minutesDiff > 55}`);
    console.log(`   Is event <= NOW + 65 minutes? ${minutesDiff <= 65}`);
    console.log(`   Should trigger 1-hour reminder? ${minutesDiff > 55 && minutesDiff <= 65}\n`);

    // Check tracking records for event 84
    const trackingResult = await pool.query(
      `SELECT * FROM reminder_tracking 
       WHERE event_id = 84 
       ORDER BY reminder_type, user_id`
    );

    console.log(`📋 Reminder Tracking Records (${trackingResult.rows.length}):`);
    trackingResult.rows.forEach(record => {
      console.log(`   User ${record.user_id} - ${record.reminder_type}:`);
      console.log(`      Scheduled: ${record.scheduled_time}`);
      console.log(`      Email sent: ${record.email_sent}`);
      console.log(`      Notification sent: ${record.notification_sent}`);
      console.log(`      Sent at: ${record.sent_at || 'Not sent'}\n`);
    });

    // Run the actual query that finds reminders to send
    console.log('🔍 Running actual reminder query...\n');
    
    const reminderQuery = `
      WITH upcoming_events AS (
        SELECT 
          ce.id as event_id,
          ce.title as event_title,
          ce.start_time as event_start_time,
          ce.end_time as event_end_time,
          ce.location as event_location,
          ce.description as event_description,
          ce.created_by,
          ce.assigned_to,
          ce.attendees
        FROM calendar_events ce
        WHERE ce.start_time > NOW()
          AND ce.start_time <= NOW() + INTERVAL '2 days'
          AND ce.id = 84
      ),
      event_users AS (
        -- Event creators
        SELECT DISTINCT 
          ue.event_id,
          ue.event_title,
          ue.event_start_time,
          ue.event_end_time,
          ue.event_location,
          ue.event_description,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM upcoming_events ue
        JOIN users u ON u.id = ue.created_by
        
        UNION
        
        -- Event assignees
        SELECT DISTINCT 
          ue.event_id,
          ue.event_title,
          ue.event_start_time,
          ue.event_end_time,
          ue.event_location,
          ue.event_description,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM upcoming_events ue
        JOIN users u ON u.id = ue.assigned_to
        WHERE ue.assigned_to IS NOT NULL
        
        UNION
        
        -- Event attendees
        SELECT DISTINCT 
          ue.event_id,
          ue.event_title,
          ue.event_start_time,
          ue.event_end_time,
          ue.event_location,
          ue.event_description,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM upcoming_events ue
        JOIN users u ON u.name = ANY(ue.attendees)
        WHERE ue.attendees IS NOT NULL 
          AND array_length(ue.attendees, 1) > 0
      ),
      reminder_schedules AS (
        SELECT 
          eu.*,
          '1_day' as reminder_type,
          eu.event_start_time - INTERVAL '1 day' as scheduled_time,
          CASE 
            WHEN eu.event_start_time > NOW() + INTERVAL '23 hours'
              AND eu.event_start_time <= NOW() + INTERVAL '25 hours'
            THEN true 
            ELSE false 
          END as matches_time_window
        FROM event_users eu
        
        UNION
        
        SELECT 
          eu.*,
          'same_day' as reminder_type,
          DATE(eu.event_start_time) as scheduled_time,
          CASE 
            WHEN DATE(eu.event_start_time) = CURRENT_DATE
              AND eu.event_start_time > NOW()
            THEN true 
            ELSE false 
          END as matches_time_window
        FROM event_users eu
        
        UNION
        
        SELECT 
          eu.*,
          '1_hour' as reminder_type,
          eu.event_start_time - INTERVAL '1 hour' as scheduled_time,
          CASE 
            WHEN eu.event_start_time > NOW() + INTERVAL '55 minutes'
              AND eu.event_start_time <= NOW() + INTERVAL '65 minutes'
            THEN true 
            ELSE false 
          END as matches_time_window
        FROM event_users eu
      )
      SELECT 
        rs.event_id,
        rs.user_id,
        rs.user_name,
        rs.user_email,
        rs.event_title,
        rs.event_start_time,
        rs.reminder_type,
        rs.scheduled_time,
        rs.matches_time_window,
        EXISTS (
          SELECT 1 FROM reminder_tracking rt 
          WHERE rt.event_id = rs.event_id 
            AND rt.user_id = rs.user_id 
            AND rt.reminder_type = rs.reminder_type
        ) as tracking_exists,
        EXISTS (
          SELECT 1 FROM reminder_tracking rt 
          WHERE rt.event_id = rs.event_id 
            AND rt.user_id = rs.user_id 
            AND rt.reminder_type = rs.reminder_type
            AND (rt.email_sent = true OR rt.notification_sent = true)
        ) as already_sent
      FROM reminder_schedules rs
      ORDER BY rs.reminder_type, rs.user_id
    `;

    const queryResult = await pool.query(reminderQuery);
    
    console.log(`📊 Query Results (${queryResult.rows.length} rows):`);
    if (queryResult.rows.length === 0) {
      console.log('   ❌ No reminders found\n');
    } else {
      queryResult.rows.forEach(row => {
        console.log(`\n   ${row.reminder_type} reminder for user ${row.user_id}:`);
        console.log(`      Event start: ${row.event_start_time}`);
        console.log(`      Scheduled time: ${row.scheduled_time}`);
        console.log(`      Matches time window: ${row.matches_time_window}`);
        console.log(`      Tracking exists: ${row.tracking_exists}`);
        console.log(`      Already sent: ${row.already_sent}`);
        console.log(`      Would be sent: ${row.matches_time_window && !row.already_sent}`);
      });
    }

    // Check database time
    const dbTimeResult = await pool.query('SELECT NOW() as db_time, CURRENT_DATE as db_date');
    console.log('\n🕐 Database Time:');
    console.log(`   NOW(): ${dbTimeResult.rows[0].db_time}`);
    console.log(`   CURRENT_DATE: ${dbTimeResult.rows[0].db_date}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugReminderTiming();

