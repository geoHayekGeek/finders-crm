// Script to check why reminder isn't sending RIGHT NOW for event 84
const pool = require('../config/db');
const ReminderService = require('../services/reminderService');

async function checkReminderNow() {
  try {
    console.log('🔍 Checking Why Reminder Is Not Sending NOW\n');
    console.log('='.repeat(60));
    
    // Get current time
    const now = new Date();
    console.log(`Current Time: ${now.toLocaleString()}`);
    
    // Get event 84
    const eventResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        u.email as creator_email,
        (ce.start_time - NOW()) as time_until
      FROM calendar_events ce
      JOIN users u ON u.id = ce.created_by
      WHERE ce.id = 84
    `);
    
    if (eventResult.rows.length === 0) {
      console.log('❌ Event 84 not found');
      return;
    }
    
    const event = eventResult.rows[0];
    const eventStart = new Date(event.start_time);
    const totalMinutes = Math.floor((eventStart - now) / 60000);
    
    console.log(`\nEvent: "${event.title}"`);
    console.log(`Start Time: ${eventStart.toLocaleString()}`);
    console.log(`Minutes Until: ${totalMinutes} minutes`);
    console.log(`Creator Email: ${event.creator_email}\n`);
    
    // Check tracking
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
        AND reminder_type = '1_hour'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    console.log('📊 Current Tracking Status:');
    if (trackingResult.rows.length > 0) {
      const track = trackingResult.rows[0];
      console.log(`  Email Sent: ${track.email_sent ? '✅ YES' : '❌ NO'}`);
      console.log(`  Notification Sent: ${track.notification_sent ? '✅ YES' : '❌ NO'}`);
      console.log(`  Scheduled Time: ${track.scheduled_time.toLocaleString()}`);
      console.log(`  Created At: ${track.created_at.toLocaleString()}`);
      
      if (track.email_sent) {
        console.log('\n⚠️ ISSUE FOUND: Email marked as sent in tracking!');
        console.log('   This is why the query filters it out.\n');
      }
    } else {
      console.log('  ❌ No tracking record found\n');
    }
    
    // Check what the query would return
    console.log('🔍 Checking Reminder Query (getEventsNeedingRemindersDirect):');
    const eventsNeedingReminders = await ReminderService.getEventsNeedingRemindersDirect();
    
    const event84InList = eventsNeedingReminders.find(e => e.event_id === 84 && e.reminder_type === '1_hour');
    
    if (event84InList) {
      console.log('  ✅ Event 84 IS in the query results!');
      console.log(`    User: ${event84InList.user_name}`);
      console.log(`    Email: ${event84InList.user_email}`);
      console.log(`    Scheduled Time: ${event84InList.scheduled_time}`);
    } else {
      console.log('  ❌ Event 84 is NOT in the query results');
      console.log('     This means it was filtered out by the query.\n');
      
      // Check why it was filtered
      console.log('  Checking WHY it was filtered:');
      
      // The query filters out if email_sent = true OR notification_sent = true
      if (trackingResult.rows.length > 0 && trackingResult.rows[0].email_sent) {
        console.log('    ❌ Filtered because email_sent = true');
        console.log('    💡 Solution: Need to reset the tracking record');
      } else if (trackingResult.rows.length > 0 && trackingResult.rows[0].notification_sent) {
        console.log('    ❌ Filtered because notification_sent = true');
      } else {
        console.log('    ❓ Event not in query for another reason (check window)');
      }
    }
    
    // Calculate if event should be in window
    console.log('\n⏰ Timing Check:');
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);
    
    console.log(`  Current Time: ${now.toLocaleString()}`);
    console.log(`  Window: ${windowStart.toLocaleString()} to ${windowEnd.toLocaleString()}`);
    console.log(`  Event Start: ${eventStart.toLocaleString()}`);
    
    const inWindow = totalMinutes >= 55 && totalMinutes <= 65;
    console.log(`  In Window: ${inWindow ? '✅ YES' : '❌ NO'} (${totalMinutes} minutes away)\n`);
    
    if (trackingResult.rows.length > 0 && trackingResult.rows[0].email_sent && inWindow) {
      console.log('💡 SOLUTION:');
      console.log('The reminder was already marked as sent, but you want to resend it.');
      console.log('Options:');
      console.log('  1. Reset the tracking record (set email_sent = false)');
      console.log('  2. Delete the tracking record');
      console.log('\nWould you like me to reset it so the reminder can send?');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkReminderNow();

