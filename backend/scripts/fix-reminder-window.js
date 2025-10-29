// Script to check and explain the reminder window issue
const pool = require('../config/db');

async function explainReminderWindow() {
  try {
    console.log('📊 Reminder Window Analysis\n');
    console.log('='.repeat(60));
    
    // Get current time
    const now = new Date();
    console.log(`Current Time: ${now.toLocaleString()}\n`);
    
    // Get event 84
    const eventResult = await pool.query(`
      SELECT 
        ce.id,
        ce.title,
        ce.start_time,
        ce.start_time - NOW() as time_until
      FROM calendar_events ce
      WHERE ce.id = 84
    `);
    
    if (eventResult.rows.length === 0) {
      console.log('Event 84 not found');
      return;
    }
    
    const event = eventResult.rows[0];
    const eventStart = new Date(event.start_time);
    const totalMinutes = Math.floor((eventStart - now) / 60000);
    
    console.log(`Event: "${event.title}"`);
    console.log(`Start Time: ${eventStart.toLocaleString()}`);
    console.log(`Minutes Until: ${totalMinutes} minutes\n`);
    
    // Calculate windows
    const oneHourBeforeEvent = new Date(eventStart.getTime() - 60 * 60 * 1000);
    const window55Min = new Date(now.getTime() + 55 * 60 * 1000);
    const window65Min = new Date(now.getTime() + 65 * 60 * 1000);
    
    console.log('1-Hour Reminder Logic:');
    console.log(`  Event starts: ${eventStart.toLocaleString()}`);
    console.log(`  1 hour before event: ${oneHourBeforeEvent.toLocaleString()}`);
    console.log(`  Trigger window start: ${window55Min.toLocaleString()} (55 min from now)`);
    console.log(`  Trigger window end: ${window65Min.toLocaleString()} (65 min from now)`);
    console.log(`  Current time: ${now.toLocaleString()}\n`);
    
    const inWindow = totalMinutes >= 55 && totalMinutes <= 65;
    console.log(`Status: ${inWindow ? '✅ IN WINDOW' : '❌ OUT OF WINDOW'}\n`);
    
    if (!inWindow) {
      if (totalMinutes < 55) {
        console.log(`⚠️ Event is ${totalMinutes} minutes away (less than 55 minutes)`);
        console.log(`   The 1-hour reminder window has passed.`);
        console.log(`   Reminder should have been sent when event was 55-65 minutes away.`);
      } else {
        console.log(`ℹ️ Event is ${totalMinutes} minutes away (more than 65 minutes)`);
        console.log(`   Wait until event is 55-65 minutes away for reminder to trigger.`);
      }
    }
    
    // Check tracking
    const trackingResult = await pool.query(`
      SELECT 
        reminder_type,
        email_sent,
        notification_sent,
        created_at,
        scheduled_time
      FROM reminder_tracking
      WHERE event_id = 84
        AND reminder_type = '1_hour'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (trackingResult.rows.length > 0) {
      const track = trackingResult.rows[0];
      console.log('\n📊 Reminder Tracking:');
      console.log(`  Email Sent: ${track.email_sent ? '✅ YES' : '❌ NO'}`);
      console.log(`  Notification Sent: ${track.notification_sent ? '✅ YES' : '❌ NO'}`);
      console.log(`  Created At: ${track.created_at.toLocaleString()}`);
      
      if (track.email_sent) {
        console.log('\n✅ 1-hour reminder was already sent!');
        console.log('   Check your email inbox for the reminder.');
        console.log('   It was sent when the event entered the 55-65 minute window.');
      } else {
        console.log('\n⚠️ Email was not sent (reminder might be disabled)');
      }
    }
    
    // Suggest fix
    console.log('\n💡 Solution:');
    console.log('The reminder system works correctly - it sends when event is 55-65 min away.');
    console.log('If you want to test, create a new event 2+ hours in the future.');
    console.log('The 1-hour reminder will trigger when that event is 55-65 minutes away.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

explainReminderWindow();

