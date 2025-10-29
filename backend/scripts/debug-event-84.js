// Script to debug why event 84 reminders aren't being sent
const pool = require('../config/db');
const Settings = require('../models/settingsModel');
const ReminderService = require('../services/reminderService');

async function debugEvent84() {
  try {
    console.log('🔍 Debugging Event 84 Reminder Issue\n');
    console.log('='.repeat(60));
    
    // Get event details
    console.log('\n📅 Event 84 Details:');
    const eventResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        ce.end_time,
        ce.created_by,
        ce.assigned_to,
        ce.start_time - NOW() as time_until,
        u.name as creator_name,
        u.email as creator_email
      FROM calendar_events ce
      JOIN users u ON u.id = ce.created_by
      WHERE ce.id = 84
    `);
    
    if (eventResult.rows.length === 0) {
      console.log('❌ Event 84 not found');
      return;
    }
    
    const event = eventResult.rows[0];
    const totalMinutes = (event.time_until.hours || 0) * 60 + (event.time_until.minutes || 0);
    
    console.log(`  Title: "${event.title}"`);
    console.log(`  Start Time: ${event.start_time.toLocaleString()}`);
    console.log(`  Time Until: ${totalMinutes} minutes (${event.time_until.hours || 0}h ${event.time_until.minutes || 0}m)`);
    console.log(`  Creator: ${event.creator_name} (${event.creator_email})`);
    
    // Check reminder tracking
    console.log('\n📊 Reminder Tracking Records:');
    const trackingResult = await pool.query(`
      SELECT 
        id,
        reminder_type,
        scheduled_time,
        email_sent,
        notification_sent,
        created_at
      FROM reminder_tracking
      WHERE event_id = 84
      ORDER BY reminder_type
    `);
    
    if (trackingResult.rows.length > 0) {
      trackingResult.rows.forEach(track => {
        console.log(`\n  ${track.reminder_type}:`);
        console.log(`    Scheduled: ${track.scheduled_time.toLocaleString()}`);
        console.log(`    Email Sent: ${track.email_sent ? '✅' : '❌'}`);
        console.log(`    Notification Sent: ${track.notification_sent ? '✅' : '❌'}`);
        console.log(`    Created: ${track.created_at.toLocaleString()}`);
        
        const scheduledUntil = new Date(track.scheduled_time) - new Date();
        const scheduledMinutes = Math.floor(scheduledUntil / 60000);
        console.log(`    Time Until Scheduled: ${scheduledMinutes} minutes`);
      });
    } else {
      console.log('  ❌ No tracking records found');
    }
    
    // Check if event should be in the query window
    console.log('\n🎯 Checking Query Windows:');
    
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const oneHourBefore = new Date(eventStart.getTime() - 60 * 60 * 1000);
    
    // 1-hour window check
    const oneHourWindowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const oneHourWindowEnd = new Date(now.getTime() + 65 * 60 * 1000);
    
    console.log('\n  1-Hour Reminder Window:');
    console.log(`    Current Time: ${now.toLocaleString()}`);
    console.log(`    Window Start: ${oneHourWindowStart.toLocaleString()} (55 min from now)`);
    console.log(`    Window End: ${oneHourWindowEnd.toLocaleString()} (65 min from now)`);
    console.log(`    Event Start: ${eventStart.toLocaleString()}`);
    console.log(`    1 Hour Before Event: ${oneHourBefore.toLocaleString()}`);
    
    const inWindow = oneHourBefore >= oneHourWindowStart && oneHourBefore <= oneHourWindowEnd;
    console.log(`    In Window: ${inWindow ? '✅ YES' : '❌ NO'}`);
    
    // Check what the query would return
    console.log('\n🔍 Testing Reminder Query:');
    const queryResult = await pool.query(`
      WITH upcoming_events AS (
        SELECT 
          ce.id as event_id,
          ce.title as event_title,
          ce.start_time as event_start_time,
          ce.end_time as event_end_time,
          ce.location as event_location,
          ce.description as event_description,
          ce.created_by,
          ce.assigned_to
        FROM calendar_events ce
        WHERE ce.id = 84
          AND ce.start_time > NOW()
      ),
      event_users AS (
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
        WHERE ue.created_by IS NOT NULL
        
        UNION
        
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
        rs.*,
        CASE WHEN EXISTS (
          SELECT 1 FROM reminder_tracking rt 
          WHERE rt.event_id = rs.event_id 
            AND rt.user_id = rs.user_id 
            AND rt.reminder_type = rs.reminder_type
            AND (rt.email_sent = true OR rt.notification_sent = true)
        ) THEN true ELSE false END as already_sent
      FROM reminder_schedules rsMedium
    `);
    
    if (queryResult.rows.length > 0) {
      console.log(`  ✅ Query found ${queryResult.rows.length} reminder(s):`);
      queryResult.rows.forEach(row => {
        console.log(`    - ${row.reminder_type} for ${row.user_name}`);
        console.log(`      Already Sent: ${row.already_sent ? '✅ YES (filtered out)' : '❌ NO'}`);
      });
    } else {
      console.log('  ❌ Query returned 0 results');
      console.log('\n  Possible reasons:');
      console.log('    1. Event not in 55-65 minute window');
      console.log('    2. Reminder already marked as sent');
      console.log('    3. Event is in the past');
    }
    
    // Check settings
    console.log('\n⚙️ Reminder Settings:');
    const settings = {
      global: await Settings.isEmailNotificationsEnabled(),
      calendar: await Settings.isEmailNotificationTypeEnabled('calendar_events'),
      oneHour: await Settings.isReminderEnabled('1_hour'),
      sameDay: await Settings.isReminderEnabled('same_day'),
      oneDay: await Settings.isReminderEnabled('1_day')
    };
    
    console.log(`  Global Email: ${settings.global ? '✅' : '❌'}`);
    console.log(`  Calendar Events: ${settings.calendar ? '✅' : '❌'}`);
    console.log(`  1 Hour Before: ${settings.oneHour ? '✅' : '❌'}`);
    console.log(`  Same Day: ${settings.sameDay ? '✅' : '❌'}`);
    console.log(`  1 Day Before: ${settings.oneDay ? '✅' : '❌'}`);
    
    // Manual test
    console.log('\n🧪 Manual Test - Getting Events Needing Reminders:');
    const eventsNeedingReminders = await ReminderService.getEventsNeedingRemindersDirect();
    console.log(`  Found ${eventsNeedingReminders.length} events needing reminders`);
    
    const event84InList = eventsNeedingReminders.find(e => e.event_id === 84);
    if (event84InList) {
      console.log(`  ✅ Event 84 IS in the list!`);
      console.log(`    Reminder Type: ${event84InList.reminder_type}`);
      console.log(`    Scheduled Time: ${event84InList.scheduled_time}`);
    } else {
      console.log(`  ❌ Event 84 is NOT in the list`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('💡 Summary:');
    
    if (queryResult.rows.length === 0 && !event84InList) {
      console.log('\n  Issue: Event is not in the 55-65 minute trigger window');
      console.log(`  Solution: Wait until event is ${totalMinutes < 55 ? 'closer to' : 'in'} the 55-65 minute window`);
      console.log(`  Current: ${totalMinutes} minutes until event`);
      console.log(`  Needed: 55-65 minutes until event`);
    } else if (event84InList) {
      console.log('\n  ✅ Event 84 should trigger reminders!');
      console.log('  Issue might be in email sending logic');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

debugEvent84();

