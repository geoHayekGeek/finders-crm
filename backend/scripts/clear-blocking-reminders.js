// Script to clear blocking reminder tracking records
// These are records marked as "sent" but were actually skipped due to disabled settings
const pool = require('../config/db');

async function clearBlockingReminders() {
  console.log('🧹 Clearing blocking reminder records...\n');
  
  try {
    // Show what we're about to delete
    console.log('📋 Current blocking records for upcoming events:');
    const checkResult = await pool.query(`
      SELECT 
        rt.id,
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
    
    if (checkResult.rows.length > 0) {
      console.table(checkResult.rows);
      
      // Delete these records
      const deleteResult = await pool.query(`
        DELETE FROM reminder_tracking rt
        USING calendar_events ce
        WHERE rt.event_id = ce.id
          AND ce.start_time > NOW()
          AND (rt.email_sent = true OR rt.notification_sent = true)
      `);
      
      console.log(`\n✅ Deleted ${deleteResult.rowCount} blocking reminder records`);
      console.log('✨ These reminders can now be sent when their time windows arrive!');
    } else {
      console.log('  No blocking records found (all clear!)');
    }
    
    // Show remaining tracking records
    console.log('\n📊 Remaining tracking records:');
    const remainingResult = await pool.query(`
      SELECT 
        rt.id,
        rt.event_id,
        rt.reminder_type,
        rt.email_sent,
        rt.notification_sent
      FROM reminder_tracking rt
      JOIN calendar_events ce ON ce.id = rt.event_id
      WHERE ce.start_time > NOW()
      ORDER BY ce.start_time
    `);
    
    if (remainingResult.rows.length > 0) {
      console.table(remainingResult.rows);
    } else {
      console.log('  None (reminders will be created when their time windows arrive)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

clearBlockingReminders();


