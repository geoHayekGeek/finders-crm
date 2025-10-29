// Script to check current email notification settings
const pool = require('../config/db');

async function checkEmailSettings() {
  try {
    console.log('📋 Checking Email Notification Settings\n');
    console.log('='.repeat(50));
    
    // Get all email-related settings
    const result = await pool.query(`
      SELECT 
        setting_key,
        setting_value,
        setting_type,
        category
      FROM system_settings
      WHERE category IN ('email', 'reminders')
        OR setting_key LIKE '%email%'
        OR setting_key LIKE '%reminder%'
      ORDER BY category, setting_key
    `);
    
    console.log('\n📧 Email Settings:');
    result.rows.forEach(row => {
      const value = row.setting_key.includes('pass') 
        ? '••••••••••••••••' 
        : row.setting_value;
      console.log(`  ${row.setting_key}: ${value} (${row.setting_type})`);
    });
    
    console.log('\n🔍 Specific Reminder Settings:');
    const reminderKeys = [
      'reminder_1_day_before',
      'reminder_same_day', 
      'reminder_1_hour_before'
    ];
    
    reminderKeys.forEach(key => {
      const setting = result.rows.find(r => r.setting_key === key);
      if (setting) {
        const isEnabled = setting.setting_value === 'true';
        console.log(`  ${key}: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'} (value: "${setting.setting_value}")`);
      } else {
        console.log(`  ${key}: ⚠️ NOT FOUND in database`);
      }
    });
    
    console.log('\n📊 Email Notification Toggles:');
    const emailKeys = [
      'email_notifications_enabled',
      'email_notifications_calendar_events'
    ];
    
    emailKeys.forEach(key => {
      const setting = result.rows.find(r => r.setting_key === key);
      if (setting) {
        const isEnabled = setting.setting_value === 'true';
        console.log(`  ${key}: ${isEnabled ? '✅ ENABLED' : '❌ DISABLED'} (value: "${setting.setting_value}")`);
      } else {
        console.log(`  ${key}: ⚠️ NOT FOUND in database`);
      }
    });
    
    // Check for any upcoming events
    console.log('\n📅 Checking Upcoming Events for Reminder Testing:');
    const eventsResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        (ce.start_time - NOW()) as time_until,
        u.email as creator_email
      FROM calendar_events ce
      JOIN users u ON u.id = ce.created_by
      WHERE ce.start_time > NOW()
        AND ce.start_time <= NOW() + INTERVAL '3 hours'
      ORDER BY ce.start_time
      LIMIT 5
    `);
    
    if (eventsResult.rows.length > 0) {
      console.log('\nEvents that should trigger 1-hour reminders soon:');
      eventsResult.rows.forEach(event => {
        const hoursUntil = event.time_until.hours || 0;
        const minutesUntil = event.time_until.minutes || 0;
        console.log(`  - "${event.title}" (${hoursUntil}h ${minutesUntil}m from now) - Creator: ${event.creator_email}`);
      });
    } else {
      console.log('  No events starting in the next 3 hours');
    }
    
    // Check recent reminder tracking
    console.log('\n📊 Recent Reminder Tracking (last 10):');
    const trackingResult = await pool.query(`
      SELECT 
        rt.id,
        rt.event_id,
        rt.reminder_type,
        rt.email_sent,
        rt.notification_sent,
        rt.created_at,
        ce.title as event_title,
        ce.start_time
      FROM reminder_tracking rt
      JOIN calendar_events ce ON ce.id = rt.event_id
      WHERE ce.start_time > NOW() - INTERVAL '1 day'
      ORDER BY rt.created_at DESC
      LIMIT 10
    `);
    
    if (trackingResult.rows.length > 0) {
      trackingResult.rows.forEach(tracking => {
        const emailStatus = tracking.email_sent ? '✅' : '❌';
        const notifStatus = tracking.notification_sent ? '✅' : '❌';
        console.log(`  ${tracking.reminder_type} for "${tracking.event_title}": Email ${emailStatus} | Notif ${notifStatus} | ${tracking.created_at.toLocaleString()}`);
      });
    } else {
      console.log('  No recent reminder tracking records');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkEmailSettings();

