// Script to test reminder settings logic
const pool = require('../config/db');
const Settings = require('../models/settingsModel');

async function testReminderSettings() {
  try {
    console.log('🧪 Testing Reminder Settings Logic\n');
    console.log('='.repeat(50));
    
    // Test each reminder type check
    console.log('\n📋 Testing Settings Checks:\n');
    
    const types = ['1_day', 'same_day', '1_hour'];
    
    for (const type of types) {
      const isEnabled = await Settings.isReminderEnabled(type);
      console.log(`  ${type}: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      
      // Also show database value
      const dbKey = {
        '1_day': 'reminder_1_day_before',
        'same_day': 'reminder_same_day',
        '1_hour': 'reminder_1_hour_before'
      }[type];
      
      const setting = await Settings.getByKey(dbKey);
      console.log(`     Database: ${dbKey} = "${setting?.setting_value || 'NOT FOUND'}"`);
    }
    
    // Check what the logic would do for each type
    console.log('\n🔍 Checking Logic for Each Reminder Type:\n');
    
    const globalEnabled = await Settings.isEmailNotificationsEnabled();
    const calendarEnabled = await Settings.isEmailNotificationTypeEnabled('calendar_events');
    
    console.log(`Global Email: ${globalEnabled ? '✅' : '❌'}`);
    console.log(`Calendar Events: ${calendarEnabled ? '✅' : '❌'}`);
    console.log('');
    
    for (const type of types) {
      const reminderEnabled = await Settings.isReminderEnabled(type);
      
      const wouldSend = globalEnabled && calendarEnabled && reminderEnabled;
      
      console.log(`${type}:`);
      console.log(`  - Global: ${globalEnabled ? '✅' : '❌'}`);
      console.log(`  - Calendar: ${calendarEnabled ? '✅' : '❌'}`);
      console.log(`  - Reminder Type: ${reminderEnabled ? '✅' : '❌'}`);
      console.log(`  - WOULD SEND EMAIL: ${wouldSend ? '✅ YES' : '❌ NO'}`);
      console.log('');
    }
    
    // Check for events that should trigger 1-hour reminders NOW
    console.log('📅 Events That Should Trigger 1-Hour Reminders (55-65 min from now):\n');
    
    const eventsResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        (ce.start_time - NOW()) as time_until,
        u.email as creator_email
      FROM calendar_events ce
      JOIN users u ON u.id = ce.created_by
      WHERE ce.start_time > NOW() + INTERVAL '55 minutes'
        AND ce.start_time <= NOW() + INTERVAL '65 minutes'
      ORDER BY ce.start_time
    `);
    
    if (eventsResult.rows.length > 0) {
      for (const event of eventsResult.rows) {
        const totalMinutes = (event.time_until.hours || 0) * 60 + (event.time_until.minutes || 0);
        console.log(`  Event: "${event.title}"`);
        console.log(`    ID: ${event.id}`);
        console.log(`    Starts in: ${totalMinutes} minutes`);
        console.log(`    Creator: ${event.creator_email}`);
        
        // Check if reminder was already sent
        const trackingResult = await pool.query(`
          SELECT email_sent, notification_sent, created_at
          FROM reminder_tracking
          WHERE event_id = $1 
            AND reminder_type = '1_hour'
          ORDER BY created_at DESC
          LIMIT 1
        `, [event.id]);
        
        if (trackingResult.rows.length > 0) {
          const tracking = trackingResult.rows[0];
          console.log(`    Status: Already sent (Email: ${tracking.email_sent ? '✅' : '❌'}, Notif: ${tracking.notification_sent ? '✅' : '❌'})`);
        } else {
          console.log(`    Status: ⚠️ NOT YET SENT - Should be sent by reminder service`);
        }
        console.log('');
      }
    } else {
      console.log('  No events in 55-65 minute window');
    }
    
    // Check events that just passed the 1-hour window
    console.log('📅 Events That Just Passed 1-Hour Window (45-55 min from now):\n');
    
    const passedResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        (ce.start_time - NOW()) as time_until,
        u.email as creator_email
      FROM calendar_events ce
      JOIN users u ON u.id = ce.created_by
      WHERE ce.start_time > NOW() + INTERVAL '45 minutes'
        AND ce.start_time <= NOW() + INTERVAL '55 minutes'
      ORDER BY ce.start_time
    `);
    
    if (passedResult.rows.length > 0) {
      for (const event of passedResult.rows) {
        const totalMinutes = (event.time_until.hours || 0) * 60 + (event.time_until.minutes || 0);
        console.log(`  Event: "${event.title}" (${totalMinutes} min away) - ⚠️ PAST 1-hour trigger window`);
      }
    } else {
      console.log('  None');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testReminderSettings();

